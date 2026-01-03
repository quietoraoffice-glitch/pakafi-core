import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from './app.entity';
import { UserApp } from './user-app.entity';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppEntity, UserApp]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
