import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInviteDto } from './drawings.dto';
import { InvitesService } from './invites.service';

/** Rotas owner-only para gerenciar convites de um drawing. */
@Controller('drawings/:drawingId/invites')
@UseGuards(JwtAuthGuard)
export class DrawingInvitesController {
  constructor(private readonly svc: InvitesService) {}

  @Get()
  list(@Param('drawingId') drawingId: string, @CurrentUserId() userId: string) {
    return this.svc.list(drawingId, userId);
  }

  @Post()
  create(
    @Param('drawingId') drawingId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.svc.create(drawingId, userId, dto);
  }

  @Delete(':inviteId')
  revoke(
    @Param('drawingId') drawingId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.svc.revoke(drawingId, inviteId, userId);
  }
}

/** Rotas públicas/aceite por token. */
@Controller('invites')
export class PublicInvitesController {
  constructor(private readonly svc: InvitesService) {}

  @Get(':token')
  preview(@Param('token') token: string) {
    return this.svc.preview(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  accept(@Param('token') token: string, @CurrentUserId() userId: string) {
    return this.svc.accept(token, userId);
  }
}
