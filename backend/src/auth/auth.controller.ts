import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Controller, Post, Body, Get } from '@nestjs/common';

class RegisterDto {
  email: string;
  password: string;
  name?: string;
}

class LoginDto {
  email: string;
  password: string;
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
}
