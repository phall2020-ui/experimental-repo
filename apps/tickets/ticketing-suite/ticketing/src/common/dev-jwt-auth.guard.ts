import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DevJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // In dev mode without OIDC, decode JWT manually without verification
    if (!process.env.OIDC_ISSUER) {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No token provided');
      }
      
      try {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        
        if (parts.length !== 3) {
          throw new UnauthorizedException('Invalid token format');
        }
        
        // Decode payload (base64url decode)
        const payload = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        );
        
        // Set user on request
        request.user = {
          sub: payload.sub || 'dev-user',
          tenantId: payload.tenantId || 'tenant-1',
          roles: payload.roles || ['AssetManager', 'OandM'],
          email: payload.email || 'dev@example.com'
        };
        
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    }
    
    // In production with OIDC, use normal JWT verification
    return super.canActivate(context);
  }
}
