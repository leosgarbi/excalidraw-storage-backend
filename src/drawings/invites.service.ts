import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InviteStatus } from '@prisma/client';
import { PermissionsService } from '../common/permissions.service';
import { generateInviteToken } from '../common/tokens';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './drawings.dto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  async list(drawingId: string, userId: string) {
    await this.perms.requireOwner(drawingId, userId);
    const invites = await this.prisma.drawingInvite.findMany({
      where: { drawingId },
      orderBy: { createdAt: 'desc' },
    });
    return { invites: invites.map((i) => this.computeStatus(i)) };
  }

  async create(drawingId: string, userId: string, dto: CreateInviteDto) {
    await this.perms.requireOwner(drawingId, userId);
    const email = dto.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new BadRequestException('Email inválido');

    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { ownerId: true, owner: { select: { email: true } } },
    });
    if (!drawing) throw new NotFoundException();
    if (drawing.owner.email.toLowerCase() === email) {
      throw new ConflictException('Este já é o dono do desenho');
    }

    const existingMember = await this.prisma.drawingMember.findFirst({
      where: { drawingId, user: { email } },
    });
    if (existingMember) {
      throw new ConflictException('Usuário já é membro');
    }

    const pending = await this.prisma.drawingInvite.findFirst({
      where: { drawingId, email, status: InviteStatus.PENDING },
    });
    if (pending && pending.expiresAt > new Date()) {
      throw new ConflictException('Já existe convite pendente para este email');
    }

    const invite = await this.prisma.drawingInvite.create({
      data: {
        drawingId,
        email,
        role: dto.role,
        token: generateInviteToken(),
        expiresAt: new Date(Date.now() + TTL_MS),
        createdById: userId,
      },
    });
    return this.computeStatus(invite);
  }

  async revoke(drawingId: string, inviteId: string, userId: string) {
    await this.perms.requireOwner(drawingId, userId);
    const invite = await this.prisma.drawingInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.drawingId !== drawingId) {
      throw new NotFoundException();
    }
    await this.prisma.drawingInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED },
    });
    return { ok: true };
  }

  async preview(token: string) {
    const invite = await this.prisma.drawingInvite.findUnique({
      where: { token },
      include: {
        drawing: { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!invite) throw new NotFoundException('Convite inválido');
    const status = this.deriveStatus(invite.status, invite.expiresAt);
    return {
      drawingId: invite.drawing.id,
      drawingName: invite.drawing.name,
      ownerName: invite.createdBy.name ?? invite.createdBy.email,
      role: invite.role,
      email: invite.email,
      status,
      expiresAt: invite.expiresAt,
    };
  }

  async accept(token: string, userId: string) {
    const invite = await this.prisma.drawingInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('Convite inválido');
    const status = this.deriveStatus(invite.status, invite.expiresAt);
    if (status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Convite ${status.toLowerCase()}`);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException();
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException(
        `Este convite é para ${invite.email}. Faça login com essa conta.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.drawingMember.upsert({
        where: {
          drawingId_userId: { drawingId: invite.drawingId, userId },
        },
        create: { drawingId: invite.drawingId, userId, role: invite.role },
        update: { role: invite.role },
      }),
      this.prisma.drawingInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      }),
    ]);

    return { drawingId: invite.drawingId };
  }

  private computeStatus<T extends { status: InviteStatus; expiresAt: Date }>(
    invite: T,
  ): T {
    return { ...invite, status: this.deriveStatus(invite.status, invite.expiresAt) };
  }

  private deriveStatus(status: InviteStatus, expiresAt: Date): InviteStatus {
    if (status === InviteStatus.PENDING && expiresAt < new Date()) {
      return InviteStatus.EXPIRED;
    }
    return status;
  }
}
