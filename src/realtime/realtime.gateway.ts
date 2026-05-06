import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as cookie from 'cookie';
import { Server, Socket } from 'socket.io';
import { PermissionsService } from '../common/permissions.service';

const COOKIE_NAME = 'token';

interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    drawingId?: string;
    canEdit?: boolean;
  };
}

/**
 * Gateway de colaboração em tempo real.
 *
 * Modelo: cada drawing vira uma "sala" Socket.IO (`drawing:<id>`). Clientes
 * autenticados que tenham acesso ao desenho entram na sala via `join` e
 * trocam mensagens de `scene-update` (elementos) e `pointer-update` (cursores)
 * com broadcast para os outros membros da sala.
 *
 * Auth: cookie JWT (`token`) lido do handshake. CORS controlado por
 * `CORS_ORIGINS`, mesmas regras do HTTP.
 */
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  },
  // Path padrão `/socket.io`. Mantemos pra compatibilidade com clients oficiais.
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly perms: PermissionsService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const rawCookie = client.handshake.headers.cookie ?? '';
      const parsed = cookie.parse(rawCookie);
      const token = parsed[COOKIE_NAME];
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    const { drawingId, userId } = client.data;
    if (drawingId) {
      // Notifica os demais que esse usuário saiu (limpeza de cursor).
      client
        .to(`drawing:${drawingId}`)
        .emit('peer-left', { socketId: client.id, userId });
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { drawingId?: string },
  ): Promise<{ ok: true; canEdit: boolean } | { ok: false; error: string }> {
    const userId = client.data.userId;
    const drawingId = body?.drawingId;
    if (!userId || !drawingId) return { ok: false, error: 'invalid' };

    const level = await this.perms.getAccessLevel(drawingId, userId);
    if (!level) return { ok: false, error: 'forbidden' };

    // Sai de qualquer sala anterior (caso o socket faça re-join).
    if (client.data.drawingId && client.data.drawingId !== drawingId) {
      void client.leave(`drawing:${client.data.drawingId}`);
    }

    client.data.drawingId = drawingId;
    client.data.canEdit = level === 'OWNER' || level === 'EDITOR';
    void client.join(`drawing:${drawingId}`);
    client.to(`drawing:${drawingId}`).emit('peer-joined', {
      socketId: client.id,
      userId,
    });
    return { ok: true, canEdit: client.data.canEdit };
  }

  @SubscribeMessage('scene-update')
  handleSceneUpdate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { elements: unknown; appState?: unknown },
  ): void {
    const { drawingId, canEdit, userId } = client.data;
    if (!drawingId || !canEdit) return;
    if (!body || !Array.isArray(body.elements)) return;
    client.to(`drawing:${drawingId}`).emit('scene-update', {
      from: { socketId: client.id, userId },
      elements: body.elements,
      // appState é opcional; não retransmitimos para evitar conflito de
      // viewport/zoom entre os pares (cada um tem o seu).
    });
  }

  @SubscribeMessage('pointer-update')
  handlePointerUpdate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: {
      pointer?: { x: number; y: number; tool?: string };
      button?: 'down' | 'up';
      selectedElementIds?: Record<string, true>;
      username?: string;
      color?: { background: string; stroke: string };
    },
  ): void {
    const { drawingId, userId } = client.data;
    if (!drawingId || !body) return;
    client.to(`drawing:${drawingId}`).emit('pointer-update', {
      from: { socketId: client.id, userId },
      ...body,
    });
  }
}
