import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private buildToken(user: User) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(email: string, password: string, name?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Email déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createWithPassword(
      email,
      passwordHash,
      name,
      'USER', // tout le monde est USER par défaut
    );

    const token = await this.buildToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const token = await this.buildToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  // 🧿 BOOTSTRAP OWNER (une seule fois)
  async bootstrapOwner(email: string, secret: string) {
    const configuredSecret = process.env.OWNER_BOOTSTRAP_SECRET;
    if (!configuredSecret) {
      throw new BadRequestException(
        'OWNER_BOOTSTRAP_SECRET non défini côté serveur',
      );
    }

    if (secret !== configuredSecret) {
      throw new UnauthorizedException('Secret bootstrap invalide');
    }

    const existingOwner = await this.usersService.findOwner();
    if (existingOwner) {
      throw new BadRequestException(
        'Un OWNER existe déjà. Bootstrap désactivé.',
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(
        'Utilisateur introuvable avec cet email pour devenir OWNER',
      );
    }

    user.role = 'OWNER';
    const saved = await this.usersService.save(user);
    const token = await this.buildToken(saved);

    return {
      message: 'OWNER défini avec succès',
      user: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: saved.role,
      },
      token,
    };
  }
}
