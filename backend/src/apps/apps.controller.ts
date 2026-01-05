import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AppsService } from './apps.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerOnlyGuard } from '../auth/owner-only.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(
    @Req() req: Request & { user?: JwtPayload },
    @Body() dto: HeartbeatDto,
  ) {
    const user = { id: req.user!.sub } as any;
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

  @UseGuards(JwtAuthGuard, OwnerOnlyGuard)
  @Delete('owner/cleanup-null-userapps')
  ownerCleanupNullUserApps() {
    return this.appsService.ownerCleanupNullUserApps();
  }
}
