import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('debug')
  debug() {
    return {
      ok: true,
      route: 'auth/debug',
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

  // 🧿 Route spéciale de couronnement OWNER (à utiliser une seule fois)
  @Post('bootstrap-owner')
  async bootstrapOwner(@Body() body: BootstrapOwnerDto) {
    const { email, secret } = body;
    return this.authService.bootstrapOwner(email, secret);
  }
}
