import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../infra/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async register(email: string, password: string, name: string, role: 'USER' | 'ADMIN', tenantId: string) {
    const hash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hash, name, role, tenantId },
      select: { id: true, email: true, name: true, role: true, tenantId: true }
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
    return { token: this.jwt.sign(payload) };
  }

  async updateUser(id: string, data: { name?: string; email?: string; role?: 'USER' | 'ADMIN' }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new BadRequestException('Email already in use');
    }
    
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, tenantId: true }
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash }
    });
    return { success: true };
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) throw new UnauthorizedException('Invalid old password');
    
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash }
    });
    return { success: true };
  }
}
