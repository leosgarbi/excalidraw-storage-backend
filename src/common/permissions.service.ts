import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AccessLevel = 'OWNER' | 'EDITOR' | 'VIEWER';

const RANK: Record<AccessLevel, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessLevel(drawingId: string, userId: string): Promise<AccessLevel | null> {
    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { ownerId: true },
    });
    if (!drawing) return null;
    if (drawing.ownerId === userId) return 'OWNER';

    const member = await this.prisma.drawingMember.findUnique({
      where: { drawingId_userId: { drawingId, userId } },
      select: { role: true },
    });
    if (!member) return null;
    return member.role as AccessLevel;
  }

  hasAtLeast(actual: AccessLevel | null, required: AccessLevel): boolean {
    if (!actual) return false;
    return RANK[actual] >= RANK[required];
  }

  async requireRead(drawingId: string, userId: string): Promise<AccessLevel> {
    const level = await this.getAccessLevel(drawingId, userId);
    if (!level) throw new NotFoundException('Drawing não encontrado');
    return level;
  }

  async requireWrite(drawingId: string, userId: string): Promise<AccessLevel> {
    const level = await this.requireRead(drawingId, userId);
    if (!this.hasAtLeast(level, 'EDITOR')) {
      throw new ForbiddenException('Sem permissão de edição');
    }
    return level;
  }

  async requireOwner(drawingId: string, userId: string): Promise<AccessLevel> {
    const level = await this.requireRead(drawingId, userId);
    if (level !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono pode executar esta ação');
    }
    return level;
  }
}

export { Role };

