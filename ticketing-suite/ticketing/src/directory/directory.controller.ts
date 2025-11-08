import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../infra/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('directory')
export class DirectoryController {
  constructor(private prisma: PrismaService) {}

  private tenant(req: any) {
    return req.user.tenantId;
  }

  @Get('sites')
  @Roles('ADMIN', 'USER')
  sites(@Req() req: any) {
    return this.prisma.site.findMany({
      where: { tenantId: this.tenant(req) },
      select: { id: true, name: true }
    });
  }

  @Get('users')
  @Roles('ADMIN', 'USER')
  users(@Req() req: any) {
    return this.prisma.user.findMany({
      where: { tenantId: this.tenant(req) },
      select: { id: true, name: true, email: true, role: true }
    });
  }

  @Get('issue-types')
  @Roles('ADMIN', 'USER')
  types(@Req() req: any) {
    return this.prisma.issueType.findMany({
      where: { tenantId: this.tenant(req), active: true },
      select: { key: true, label: true }
    });
  }
}
