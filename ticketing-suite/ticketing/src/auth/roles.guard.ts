import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
@Injectable() export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required: string[] = this.reflector.get('roles', ctx.getHandler()) || [];
    if (!required.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const userRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : null);
    const roles: string[] = user?.roles ?? (userRole ? [userRole] : []);
    const ok = required.some(r => roles.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
    }
}
