import { Body, Controller, Delete, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private svc: AuthService) {}

  @Patch('profile')
  @Roles('ADMIN', 'USER')
  async updateMe(@Req() req: any, @Body() body: { name?: string; email?: string }) {
    const { name, email } = body;
    return this.svc.updateUser(req.user.sub, { name, email });
  }

  @Post('profile/change-password')
  @Roles('ADMIN', 'USER')
  async changePassword(@Req() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.svc.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; email?: string; role?: 'USER' | 'ADMIN' }) {
    return this.svc.updateUser(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteUser(id);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  async resetPassword(@Req() req: any, @Param('id') id: string, @Body() body: { password: string }) {
    return this.svc.resetPassword(id, body.password);
  }
}
