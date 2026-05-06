import { Module } from '@nestjs/common';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';
import {
    DrawingInvitesController,
    PublicInvitesController,
} from './invites.controller';
import { InvitesService } from './invites.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  controllers: [
    DrawingsController,
    MembersController,
    DrawingInvitesController,
    PublicInvitesController,
  ],
  providers: [DrawingsService, MembersService, InvitesService],
})
export class DrawingsModule {}
