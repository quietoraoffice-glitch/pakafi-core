import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppsService } from './apps.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(@CurrentUser() user: User, @Body() dto: HeartbeatDto) {
    return this.appsService.heartbeat(user, dto);
  }

  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner')
  ownerListApps() {
    return this.appsService.ownerListApps();
  }

  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner/:appCode/users')
  ownerAppUsers(@Param('appCode') appCode: string) {
    return this.appsService.ownerAppUsers(appCode);
  }
}
