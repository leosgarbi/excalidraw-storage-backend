import { Module } from '@nestjs/common';
import {
    FilesController,
    RoomsController,
    SceneItemController,
    ScenesController,
} from './storage.controllers';

@Module({
  controllers: [
    ScenesController,
    SceneItemController,
    RoomsController,
    FilesController,
  ],
})
export class StorageModule {}
