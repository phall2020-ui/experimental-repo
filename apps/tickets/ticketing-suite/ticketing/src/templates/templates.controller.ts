import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TemplatesService } from './templates.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  create(@Req() req: any, @Body() dto: any) {
    return this.templatesService.create(req.user.tenantId, dto, req.user.sub);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  findAll(@Req() req: any) {
    return this.templatesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.templatesService.findOne(req.user.tenantId, id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.templatesService.remove(req.user.tenantId, id);
  }
}
