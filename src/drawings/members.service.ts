import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PermissionsService } from '../common/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMemberDto } from './drawings.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  async list(drawingId: string, userId: string) {
    await this.perms.requireRead(drawingId, userId);
    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!drawing) throw new NotFoundException();
    return { owner: drawing.owner, members: drawing.members };
  }

  async update(
    drawingId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberDto,
  ) {
    await this.perms.requireOwner(drawingId, userId);
    const member = await this.prisma.drawingMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.drawingId !== drawingId) {
      throw new NotFoundException();
    }
    return this.prisma.drawingMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async remove(drawingId: string, memberId: string, userId: string) {
    await this.perms.requireOwner(drawingId, userId);
    const member = await this.prisma.drawingMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.drawingId !== drawingId) {
      throw new NotFoundException();
    }
    if (member.userId === userId) {
      throw new ForbiddenException('Owner não pode se remover');
    }
    await this.prisma.drawingMember.delete({ where: { id: memberId } });
    return { ok: true };
  }
}
