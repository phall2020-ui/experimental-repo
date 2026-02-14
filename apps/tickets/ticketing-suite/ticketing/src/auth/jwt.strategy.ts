import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions, VerifiedCallback } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const issuer = process.env.OIDC_ISSUER;
    const audience = process.env.OIDC_AUDIENCE;
    let opts: StrategyOptions;
    if (issuer && audience) {
      opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        issuer,
        audience,
        algorithms: ['RS256'],
        secretOrKeyProvider: jwksRsa.passportJwtSecret({
          cache: true, rateLimit: true, jwksUri: `${issuer}/discovery/v2.0/keys`,
        }) as any,
      };
    } else {
      // Dev mode: use a custom secret or callback to validate
      opts = { 
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
        ignoreExpiration: true, 
        secretOrKeyProvider: (request: any, rawJwtToken: any, done: any) => {
          // In dev mode, just decode without verification
          try {
            const parts = rawJwtToken.split('.');
            if (parts.length === 3) {
              // Valid JWT structure, use any secret (won't actually verify in dev)
              done(null, 'dev-secret');
            } else {
              done(new Error('Invalid token format'), null);
            }
          } catch (err) {
            done(err, null);
          }
        }
      } as any;
    }
    super(opts);
  }
  async validate(payload: any) {
    // Be permissive in development
    if (!payload) {
      if (process.env.NODE_ENV === 'development') {
        // Return a default dev user if payload is somehow missing
        return { 
          sub: 'dev-user', 
          tenantId: 'tenant-1', 
          roles: ['AssetManager', 'OandM'], 
          email: 'dev@example.com' 
        };
      }
      throw new UnauthorizedException();
    }
    const tenantId = payload[process.env.TENANT_CLAIM || 'tid'] || payload['tenantId'] || 'tenant-1';
    const roles = payload[process.env.ROLE_CLAIM || 'roles'] || payload['roles'] || ['AssetManager', 'OandM'];
    return { 
      sub: payload.sub || 'dev-user', 
      tenantId, 
      roles, 
      email: payload.preferred_username || payload.upn || payload.email || 'dev@example.com' 
    };
  }
}
