import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { Request } from 'express';
import { AppsService } from './apps.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';

type JwtPayload = { sub: number; email: string; role: string };

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  async heartbeat(@Req() req: any, @Body() dto: HeartbeatDto) {
    const userId = Number(req.user.sub); // 🔑 LA CLÉ
    return this.appsService.heartbeat(userId, dto);
  }

  // optionnel: endpoints owner via /apps aussi (tu as déjà /auth/owner/...)
  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner')
  async ownerApps() {
    return this.appsService.ownerListApps();
  }

  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Get('owner/:appCode/users')
  async ownerAppUsers(@Param('appCode') appCode: string) {
    return this.appsService.ownerAppUsers(appCode);
  }
}
