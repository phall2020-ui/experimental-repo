import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommentVisibility } from '@prisma/client';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private svc: CommentsService) {}
  private tenant(req: any) { return req.user.tenantId; }
  private userId(req: any) { return req.user?.sub; }
  private userRole(req: any) { return req.user?.role; }
  @Post()
  @Roles('ADMIN', 'USER')
  async add(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: { body: string; visibility?: CommentVisibility; mentions?: string[] }
  ) {
    return this.svc.add(
      this.tenant(req),
      ticketId,
      this.userId(req),
      dto.body,
      dto.visibility ?? CommentVisibility.INTERNAL,
      dto.mentions ?? []
    );
  }
  @Get()
  @Roles('ADMIN', 'USER')
  async list(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.svc.list(this.tenant(req), ticketId);
  }
  @Patch(':id')
  @Roles('ADMIN', 'USER')
  async update(@Req() req: any, @Param('ticketId') ticketId: string, @Param('id') id: string, @Body() dto: { body: string }) {
    return this.svc.update(this.tenant(req), ticketId, id, this.userId(req), dto.body);
  }
  @Delete(':id')
  @Roles('ADMIN', 'USER')
  async delete(@Req() req: any, @Param('ticketId') ticketId: string, @Param('id') id: string) {
    return this.svc.delete(this.tenant(req), ticketId, id, this.userId(req), this.userRole(req));
  }
}
