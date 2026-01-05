import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { AppsService } from './apps.service';

type JwtPayload = { sub: number; email: string; role: string };

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(@Req() req: Request & { user?: JwtPayload }, @Body() dto: HeartbeatDto) {
    const userId = req.user?.sub;
    return this.appsService.heartbeat(userId!, dto);
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
