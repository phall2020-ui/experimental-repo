import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from '../common/auth.guard';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async register(@Body() body: any) {
    return this.svc.register(body.email, body.password, body.name, body.role, body.tenantId);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.svc.login(body.email, body.password);
  }
}
