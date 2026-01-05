import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AppsService } from './apps.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  // App heartbeat (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(@CurrentUser() user: User, @Body() dto: HeartbeatDto) {
    return this.appsService.heartbeat(user, dto);
  }

  // OWNER: list apps stats
  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner')
  ownerListApps() {
    return this.appsService.ownerListApps();
  }

  // OWNER: list users for an app
  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner/:code/users')
  ownerAppUsers(@Param('code') code: string) {
    return this.appsService.ownerAppUsers(code);
  }
}
