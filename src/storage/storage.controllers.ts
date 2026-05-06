import {
  Body,
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsService } from '../common/permissions.service';
import { generateNumericId } from '../common/tokens';
import { PrismaService } from '../prisma/prisma.service';

const FILE_MAX_BYTES = 10 * 1024 * 1024;

function streamBuffer(res: Response, data: Buffer) {
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  stream.pipe(res);
}

/* ---------- SCENES ---------- */

@Controller('drawings/:drawingId/scenes')
@UseGuards(JwtAuthGuard)
export class ScenesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  @Post()
  async create(
    @Param('drawingId') drawingId: string,
    @CurrentUserId() userId: string,
    @Body() payload: Buffer,
  ) {
    await this.perms.requireWrite(drawingId, userId);
    if (!Buffer.isBuffer(payload) || payload.length === 0) {
      throw new InternalServerErrorException('Body inválido');
    }

    for (let i = 0; i < 5; i++) {
      const id = generateNumericId(16);
      const exists = await this.prisma.scene.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) {
        await this.prisma.scene.create({
          data: { id, drawingId, data: payload },
        });
        return { id };
      }
    }
    throw new InternalServerErrorException('Falha ao gerar ID único');
  }
}

@Controller('drawings/:drawingId/scenes/:sceneId')
@UseGuards(JwtAuthGuard)
export class SceneItemController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  @Get()
  @Header('content-type', 'application/octet-stream')
  async get(
    @Param('drawingId') drawingId: string,
    @Param('sceneId') sceneId: string,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ) {
    await this.perms.requireRead(drawingId, userId);
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene || scene.drawingId !== drawingId) throw new NotFoundException();
    streamBuffer(res, scene.data);
  }
}

/* ---------- ROOMS ---------- */

@Controller('drawings/:drawingId/rooms/:roomId')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  @Get()
  @Header('content-type', 'application/octet-stream')
  async get(
    @Param('drawingId') drawingId: string,
    @Param('roomId') roomId: string,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ) {
    await this.perms.requireRead(drawingId, userId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.drawingId !== drawingId) throw new NotFoundException();
    streamBuffer(res, room.data);
  }

  @Put()
  async upsert(
    @Param('drawingId') drawingId: string,
    @Param('roomId') roomId: string,
    @CurrentUserId() userId: string,
    @Body() payload: Buffer,
  ) {
    await this.perms.requireWrite(drawingId, userId);
    if (!Buffer.isBuffer(payload) || payload.length === 0) {
      throw new InternalServerErrorException('Body inválido');
    }
    await this.prisma.room.upsert({
      where: { id: roomId },
      create: { id: roomId, drawingId, data: payload },
      update: { data: payload, drawingId },
    });
    return { id: roomId };
  }
}

/* ---------- FILES ---------- */

@Controller('drawings/:drawingId/files/:fileId')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perms: PermissionsService,
  ) {}

  @Get()
  @Header('content-type', 'application/octet-stream')
  @Header('cache-control', 'private, max-age=31536000, immutable')
  async get(
    @Param('drawingId') drawingId: string,
    @Param('fileId') fileId: string,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ) {
    await this.perms.requireRead(drawingId, userId);
    const file = await this.prisma.fileBlob.findUnique({ where: { id: fileId } });
    if (!file || file.drawingId !== drawingId) throw new NotFoundException();
    streamBuffer(res, file.data);
  }

  @Put()
  async upsert(
    @Param('drawingId') drawingId: string,
    @Param('fileId') fileId: string,
    @CurrentUserId() userId: string,
    @Body() payload: Buffer,
  ) {
    await this.perms.requireWrite(drawingId, userId);
    if (!Buffer.isBuffer(payload) || payload.length === 0) {
      throw new InternalServerErrorException('Body inválido');
    }
    if (payload.length > FILE_MAX_BYTES) {
      throw new InternalServerErrorException('Arquivo excede 10MB');
    }
    await this.prisma.fileBlob.upsert({
      where: { id: fileId },
      create: { id: fileId, drawingId, data: payload },
      update: { data: payload, drawingId },
    });
    return { id: fileId };
  }
}
