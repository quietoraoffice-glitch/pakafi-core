import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

type ReqWithUser = {
  user?: { role?: string };
};

@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<ReqWithUser>();

    // Si JwtAuthGuard/JwtStrategy n'a pas attaché req.user → on renvoie 401 proprement
    if (!req.user) {
      throw new UnauthorizedException('Missing user in request (JWT not applied)');
    }

    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('OWNER only');
    }

    return true;
  }
}
