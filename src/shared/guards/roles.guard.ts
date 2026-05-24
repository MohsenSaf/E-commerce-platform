/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { Role } from 'generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decoratore';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // method level first
      context.getClass(), // then class level
    ]);

    // no @Roles() decorator — route is open to all authenticated users
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to do this');
    }

    return true;
  }
}
