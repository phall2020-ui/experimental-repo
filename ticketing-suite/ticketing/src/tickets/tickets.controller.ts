import { Controller, Post, Get, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

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
      custom_fields: patch.custom_fields,
    });
  }
}
