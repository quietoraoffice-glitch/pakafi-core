import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Aucun utilisateur dans la requête');
    }

    // selon ton JWT, ça peut être user.role ou user?.role
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Accès réservé au OWNER');
    }

    return true;
  }
}
