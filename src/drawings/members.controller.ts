import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateMemberDto } from './drawings.dto';
import { MembersService } from './members.service';

@Controller('drawings/:drawingId/members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly svc: MembersService) {}

  @Get()
  list(@Param('drawingId') drawingId: string, @CurrentUserId() userId: string) {
    return this.svc.list(drawingId, userId);
  }

  @Patch(':memberId')
  update(
    @Param('drawingId') drawingId: string,
    @Param('memberId') memberId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.svc.update(drawingId, memberId, userId, dto);
  }

  @Delete(':memberId')
  remove(
    @Param('drawingId') drawingId: string,
    @Param('memberId') memberId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.svc.remove(drawingId, memberId, userId);
  }
}
