import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from './app.entity';
import { UserApp } from './user-app.entity';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppEntity, UserApp])],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
