import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../users/users.service';

class RegisterDto {
  email: string;
  password: string;
  name?: string;
}

class LoginDto {
  email: string;
  password: string;
}

class BootstrapOwnerDto {
  email: string;
  secret: string;
}

class ForceSetPasswordDto {
  email: string;
  newPassword: string;
  secret: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('debug')
  debug() {
    return {
      ok: true,
      route: 'auth/debug',
    };
  }

  // 1️⃣ Qui suis-je ? (basé sur le token envoyé)
  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  whoami(@Req() req: any) {
    return {
      user: req.user,
    };
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { email, password, name } = body;
    return this.authService.register(email, password, name);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { email, password } = body;
    return this.authService.login(email, password);
  }

  @Post('bootstrap-owner')
  async bootstrapOwner(@Body() body: BootstrapOwnerDto) {
    const { email, secret } = body;
    return this.authService.bootstrapOwner(email, secret);
  }

  @Post('force-set-password')
  async forceSetPassword(@Body() body: ForceSetPasswordDto) {
    const { email, newPassword, secret } = body;
    return this.authService.forceSetPassword(email, newPassword, secret);
  }

  // 2️⃣ Panel OWNER : lister tous les users
  @Get('owner/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  async listUsers() {
    return this.usersService.findAll();
  }
}
