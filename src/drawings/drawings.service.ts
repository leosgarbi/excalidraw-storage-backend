import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PermissionsService } from '../common/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateDrawingDto,
    EMPTY_CONTENT,
    RenameDrawingDto,
    UpdateContentDto,
} from './drawings.dto';

@Injectable()
export class DrawingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  async listForUser(userId: string) {
    const owned = await this.prisma.drawing.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true,
        ownerId: true,
      },
    });

    const memberships = await this.prisma.drawingMember.findMany({
      where: { userId },
      include: {
        drawing: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
            createdAt: true,
            ownerId: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { drawing: { updatedAt: 'desc' } },
    });

    return {
      owned: owned.map((d) => ({ ...d, role: 'OWNER' as const })),
      shared: memberships.map((m) => ({
        ...m.drawing,
        role: m.role,
      })),
    };
  }

  async create(userId: string, dto: CreateDrawingDto) {
    return this.prisma.drawing.create({
      data: {
        name: dto.name?.trim() || 'Novo desenho',
        ownerId: userId,
        content: EMPTY_CONTENT,
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  async getOne(drawingId: string, userId: string) {
    const role = await this.perms.requireRead(drawingId, userId);
    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });
    if (!drawing) throw new NotFoundException();
    return { drawing, role };
  }

  async updateContent(drawingId: string, userId: string, dto: UpdateContentDto) {
    await this.perms.requireWrite(drawingId, userId);
    const sanitized = {
      type: 'excalidraw',
      version: 2,
      source: 'excalidraw-saas',
      elements: Array.isArray(dto.elements) ? dto.elements : [],
      appState:
        typeof dto.appState === 'object' && dto.appState !== null ? dto.appState : {},
      files:
        typeof dto.files === 'object' && dto.files !== null ? dto.files : {},
    };
    return this.prisma.drawing.update({
      where: { id: drawingId },
      data: { content: sanitized },
      select: { id: true, updatedAt: true },
    });
  }

  async rename(drawingId: string, userId: string, dto: RenameDrawingDto) {
    await this.perms.requireOwner(drawingId, userId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome inválido');
    return this.prisma.drawing.update({
      where: { id: drawingId },
      data: { name },
      select: { id: true, name: true },
    });
  }

  async remove(drawingId: string, userId: string) {
    await this.perms.requireOwner(drawingId, userId);
    await this.prisma.drawing.delete({ where: { id: drawingId } });
    return { ok: true };
  }
}
