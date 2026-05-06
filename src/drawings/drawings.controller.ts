import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
    CreateDrawingDto,
    RenameDrawingDto,
    UpdateContentDto,
} from './drawings.dto';
import { DrawingsService } from './drawings.service';

@Controller('drawings')
@UseGuards(JwtAuthGuard)
export class DrawingsController {
  constructor(private readonly svc: DrawingsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.svc.listForUser(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateDrawingDto) {
    return this.svc.create(userId, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.svc.getOne(id, userId);
  }

  @Put(':id')
  updateContent(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.svc.updateContent(id, userId, dto);
  }

  @Patch(':id')
  rename(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: RenameDrawingDto,
  ) {
    return this.svc.rename(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.svc.remove(id, userId);
  }
}
