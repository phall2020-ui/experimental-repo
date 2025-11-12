import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../infra/prisma.service';
import { FieldDatatype } from '@prisma/client';

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
      select: { id: true, name: true, location: true }
    });
  }

  @Post('sites')
  @Roles('ADMIN', 'USER')
  async createSite(@Req() req: any, @Body() dto: { name: string; location?: string }) {
    return this.prisma.site.create({
      data: {
        tenantId: this.tenant(req),
        name: dto.name,
        location: dto.location
      }
    });
  }

  @Patch('sites/:id')
  @Roles('ADMIN')
  async updateSite(@Req() req: any, @Param('id') id: string, @Body() dto: { name?: string; location?: string }) {
    return this.prisma.site.update({
      where: { id, tenantId: this.tenant(req) },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.location !== undefined && { location: dto.location })
      }
    });
  }

  @Delete('sites/:id')
  @Roles('ADMIN')
  async deleteSite(@Req() req: any, @Param('id') id: string) {
    return this.prisma.site.delete({
      where: { id, tenantId: this.tenant(req) }
    });
  }

  @Get('users')
  @Roles('ADMIN', 'USER')
  users(@Req() req: any) {
    return this.prisma.user.findMany({
      where: { tenantId: this.tenant(req) },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true }
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

  @Post('issue-types')
  @Roles('ADMIN')
  async createIssueType(@Req() req: any, @Body() dto: { key: string; label: string }) {
    return this.prisma.issueType.create({
      data: {
        tenantId: this.tenant(req),
        key: dto.key,
        label: dto.label,
        active: true
      }
    });
  }

  @Patch('issue-types/:id')
  @Roles('ADMIN')
  async updateIssueType(@Req() req: any, @Param('id') id: string, @Body() dto: { key?: string; label?: string; active?: boolean }) {
    return this.prisma.issueType.update({
      where: { id },
      data: {
        ...(dto.key !== undefined && { key: dto.key }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.active !== undefined && { active: dto.active })
      }
    });
  }

  @Delete('issue-types/:id')
  @Roles('ADMIN')
  async deleteIssueType(@Req() req: any, @Param('id') id: string) {
    return this.prisma.issueType.update({
      where: { id, tenantId: this.tenant(req) },
      data: { active: false }
    });
  }

  @Get('field-definitions')
  @Roles('ADMIN', 'USER')
  fieldDefinitions(@Req() req: any) {
    return this.prisma.ticketFieldDef.findMany({
      where: { tenantId: this.tenant(req) },
      select: { 
        id: true,
        key: true, 
        label: true, 
        datatype: true, 
        required: true, 
        enumOptions: true,
        validation: true,
        uiHints: true,
        isIndexed: true
      }
    });
  }

  @Post('field-definitions')
  @Roles('ADMIN')
  async createFieldDefinition(@Req() req: any, @Body() dto: {
    key: string;
    label: string;
    datatype: FieldDatatype;
    required?: boolean;
    enumOptions?: string[];
    validation?: any;
    uiHints?: any;
    isIndexed?: boolean;
  }) {
    return this.prisma.ticketFieldDef.create({
      data: {
        tenantId: this.tenant(req),
        key: dto.key,
        label: dto.label,
        datatype: dto.datatype,
        required: dto.required ?? false,
        enumOptions: dto.enumOptions ?? [],
        validation: dto.validation ?? null,
        uiHints: dto.uiHints ?? null,
        isIndexed: dto.isIndexed ?? false
      }
    });
  }

  @Patch('field-definitions/:id')
  @Roles('ADMIN')
  async updateFieldDefinition(@Req() req: any, @Param('id') id: string, @Body() dto: {
    label?: string;
    required?: boolean;
    enumOptions?: string[];
    validation?: any;
    uiHints?: any;
    isIndexed?: boolean;
  }) {
    return this.prisma.ticketFieldDef.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.enumOptions && { enumOptions: dto.enumOptions }),
        ...(dto.validation !== undefined && { validation: dto.validation }),
        ...(dto.uiHints !== undefined && { uiHints: dto.uiHints }),
        ...(dto.isIndexed !== undefined && { isIndexed: dto.isIndexed })
      }
    });
  }

  @Delete('field-definitions/:id')
  @Roles('ADMIN')
  async deleteFieldDefinition(@Req() req: any, @Param('id') id: string) {
    return this.prisma.ticketFieldDef.delete({
      where: { id, tenantId: this.tenant(req) }
    });
  }
}
