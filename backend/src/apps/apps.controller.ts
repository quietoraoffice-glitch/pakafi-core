import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AppsService } from './apps.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {} // ✅ OBLIGATOIRE

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  heartbeat(@CurrentUser() user: User, @Body() dto: HeartbeatDto) {
    return this.appsService.heartbeat(user, dto);
  }
}
