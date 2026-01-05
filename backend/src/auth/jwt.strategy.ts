import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type JwtPayload = {
  sub: number;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // En local, ça t'évite un démarrage “bizarre” sans secret
      throw new UnauthorizedException('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // ✅ string garanti
    });
  }

  async validate(payload: JwtPayload) {
    // On force un format compatible avec le reste du code:
    // req.user.id existe et vaut l'id utilisateur
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sub: payload.sub,
    };
  }
}

