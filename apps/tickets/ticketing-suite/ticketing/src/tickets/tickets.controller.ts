import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BulkUpdateTicketsDto } from './dto/bulk-update-tickets.dto';
import { BulkDeleteTicketsDto } from './dto/bulk-delete-tickets.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}
  private tenant(req: any) { return req.user.tenantId; }
  private setActor(userId?: string) { (global as any).__actorUserId = userId || null; }

  @Post()
  @Roles('ADMIN', 'USER')
  async create(@Req() req: any, @Body() body: CreateTicketDto) {
    this.setActor(req.user?.sub);
    return this.svc.create(this.tenant(req), {
      siteId: body.siteId,
      type: body.type,
      description: body.description,
      status: body.status,
      priority: body.priority,
      details: body.details,
      assignedUserId: body.assignedUserId,
      dueAt: body.dueAt,
      custom_fields: body.custom_fields ?? {},
    });
  }

  @Get()
  @Roles('ADMIN', 'USER')
  async list(@Req() req: any, @Query() q: QueryTicketDto) {
    return this.svc.list(this.tenant(req), {
      siteId: q.siteId,
      status: q.status,
      priority: q.priority,
      type: q.type,
      search: q.search,
      cf_key: q.cf_key,
      cf_val: q.cf_val,
      limit: Number(q.limit ?? 50),
      cursor: q.cursor,
    });
  }

  @Get(':id/history')
  @Roles('ADMIN', 'USER')
  async history(@Req() req: any, @Param('id') id: string) {
    return this.svc.history(this.tenant(req), id);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(this.tenant(req), id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  async update(@Req() req: any, @Param('id') id: string, @Body() patch: UpdateTicketDto) {
    this.setActor(req.user?.sub);
    return this.svc.update(this.tenant(req), id, {
      siteId: patch.siteId,
      type: patch.type,
      description: patch.description,
      status: patch.status,
      priority: patch.priority,
      details: patch.details,
      assignedUserId: patch.assignedUserId,
      dueAt: patch.dueAt,
      custom_fields: patch.custom_fields,
    });
  }

  @Patch('bulk')
  @Roles('ADMIN', 'USER')
  async bulkUpdate(@Req() req: any, @Body() body: BulkUpdateTicketsDto) {
    if (body.status === undefined && body.priority === undefined && body.assignedUserId === undefined && body.dueAt === undefined) {
      throw new BadRequestException('At least one update field must be provided');
    }
    this.setActor(req.user?.sub);
    return this.svc.bulkUpdate(this.tenant(req), body.ids, {
      status: body.status,
      priority: body.priority,
      assignedUserId: body.assignedUserId === '' ? null : body.assignedUserId,
      dueAt: body.dueAt ?? undefined,
    });
  }

  @Delete('bulk')
  @Roles('ADMIN')
  async bulkDelete(@Req() req: any, @Body() body: BulkDeleteTicketsDto) {
    this.setActor(req.user?.sub);
    return this.svc.bulkDelete(this.tenant(req), body.ids);
  }
}
