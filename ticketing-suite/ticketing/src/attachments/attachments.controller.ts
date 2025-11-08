import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}
  private tenant(req: any) { return req.user.tenantId; }
  @Post('presign')
  @Roles('ADMIN', 'USER')
  async presign(@Req() req: any, @Param('ticketId') ticketId: string, @Body() dto: { filename: string; mime: string }) {
    return this.svc.createPresigned(this.tenant(req), ticketId, dto.filename, dto.mime);
  }
  @Post(':attachmentId/finalize')
  @Roles('ADMIN', 'USER')
  async finalize(@Req() req: any, @Param('attachmentId') attachmentId: string, @Body() dto: { size: number; checksumSha256: string }) {
    return this.svc.finalize(this.tenant(req), attachmentId, dto.size, dto.checksumSha256);
  }
  @Get()
  @Roles('ADMIN', 'USER')
  async list(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.svc.list(this.tenant(req), ticketId);
  }
  @Delete(':id')
  @Roles('ADMIN', 'USER')
  async delete(@Req() req: any, @Param('ticketId') ticketId: string, @Param('id') id: string) {
    return this.svc.delete(this.tenant(req), ticketId, id);
  }
}
