import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../users/users.service';
import { AppsService } from '../apps/apps.service';


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

class UpdateUserRoleDto {
  role: 'OWNER' | 'ADMIN' | 'USER';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly appsService: AppsService,
  ) { }

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

  @Get('owner/apps')
  ownerApps() {
    return this.appsService.ownerListApps();
  }

  @Get('owner/apps/:code/users')
  ownerAppUsers(@Param('code') code: string) {
    return this.appsService.ownerAppUsers(code);
  }

  // 3️⃣ Panel OWNER : changer le rôle d'un user
  @Patch('owner/users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    const { role } = body;

    // empêcher de faire des choses bizarres : OWNER ne peut pas s'enlever lui-même
    const requester = req.user;
    if (requester && requester.sub === id && role !== 'OWNER') {
      throw new BadRequestException(
        'Tu ne peux pas retirer ton propre rôle OWNER via cette route.',
      );
    }

    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.role === 'OWNER' && role !== 'OWNER') {
      throw new BadRequestException(
        'Impossible de rétrograder un OWNER via cette route.',
      );
    }

    const updated = await this.usersService.updateRole(id, role as any);
    return {
      message: 'Rôle mis à jour',
      user: updated,
    };
  }

  // 4️⃣ Panel OWNER : supprimer un user (sauf OWNER)
  @Delete('owner/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requester = req.user;

    if (requester && requester.sub === id) {
      throw new BadRequestException('Tu ne peux pas te supprimer toi-même.');
    }

    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Impossible de supprimer un OWNER.');
    }

    await this.usersService.remove(id);
    return { message: 'Utilisateur supprimé avec succès' };
  }

  // 5️⃣ Panel OWNER : infos système simples
  @Get('owner/system-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  async systemInfo() {
    let dbStatus = 'unknown';
    let userCount = 0;

    try {
      userCount = await this.usersService.countAll();
      dbStatus = 'ok';
    } catch (e) {
      dbStatus = 'error';
    }

    return {
      app: 'Pakafi Core',
      system: 'Quietora',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: dbStatus,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
