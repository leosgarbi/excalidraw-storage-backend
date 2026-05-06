import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DrawingsModule } from './drawings/drawings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    DrawingsModule,
    StorageModule,
    RealtimeModule,
  ],
})
export class AppModule {}
