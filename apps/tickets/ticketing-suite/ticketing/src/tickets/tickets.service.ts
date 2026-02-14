import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { Prisma, TicketStatus, TicketPriority, NotificationType } from '@prisma/client';
import { allocateTicketId } from './ticket-id.util';
import { NotificationsService } from '../notifications/notifications.service';

type CFDefs = Record<string, {
  datatype: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  enumOptions?: string[];
  validation?: Record<string, unknown>;
}>;

function buildChanges(before: any | null, after: any) {
  const fields = ['status', 'details', 'priority', 'assignedUserId', 'typeKey', 'siteId', 'dueAt'];
  const changes: Record<string, { from: any; to: any }> = {};
  for (const k of fields) {
    const fromVal = before ? before[k] : undefined;
    const toVal = after[k];
    if (before === null || fromVal !== toVal) {
      changes[k] = { from: before ? (fromVal ?? null) : null, to: toVal ?? null };
    }
  }
  return changes;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async loadFieldDefs(tx: any, tenantId: string): Promise<CFDefs> {
    const defs = await tx.ticketFieldDef.findMany({ where: { tenantId }});
    const map: CFDefs = {};
    for (const d of defs) {
      map[d.key] = {
        datatype: d.datatype as any,
        required: d.required,
        enumOptions: d.enumOptions,
        validation: (d.validation ?? {}) as any,
      };
    }
    return map;
  }

  private validateCustomFields(cf: Record<string, unknown>, defs: CFDefs) {
    for (const [key, val] of Object.entries(cf ?? {})) {
      const def = defs[key];
      if (!def) throw new BadRequestException(`Unknown custom field: ${key}`);
      if (val === null || val === undefined) continue;
      switch (def.datatype) {
        case 'string': if (typeof val !== 'string') throw new BadRequestException(`${key} must be string`); break;
        case 'number': if (typeof val !== 'number') throw new BadRequestException(`${key} must be number`); break;
        case 'boolean': if (typeof val !== 'boolean') throw new BadRequestException(`${key} must be boolean`); break;
        case 'date': if (typeof val !== 'string' || isNaN(Date.parse(val))) throw new BadRequestException(`${key} must be ISO date string`); break;
        case 'enum': if (typeof val !== 'string' || !def.enumOptions?.includes(val)) throw new BadRequestException(`${key} must be one of: ${def.enumOptions?.join(', ')}`); break;
      }
    }
    for (const [key, def] of Object.entries(defs)) {
      if (def.required && !(key in (cf ?? {}))) throw new BadRequestException(`Missing required custom field: ${key}`);
    }
  }

  async create(tenantId: string, dto: {
    siteId: string; type: string; description: string;
    status: TicketStatus; priority: TicketPriority; details?: string; assignedUserId?: string;
    custom_fields?: Record<string, unknown>; dueAt?: string | null;
  }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const site = await tx.site.findFirst({ where: { id: dto.siteId, tenantId }});
      if (!site) throw new BadRequestException('Invalid siteId for tenant');
      
      // Validate typeKey exists and is active
      const issueType = await tx.issueType.findFirst({ where: { tenantId, key: dto.type, active: true }});
      if (!issueType) throw new BadRequestException('Invalid or inactive typeKey for tenant');
      
      // Validate assignedUserId if provided
      if (dto.assignedUserId) {
        const user = await tx.user.findFirst({ where: { id: dto.assignedUserId, tenantId }});
        if (!user) throw new BadRequestException('Invalid assignedUserId for tenant');
      }
      
      const defs = await this.loadFieldDefs(tx, tenantId);
      this.validateCustomFields(dto.custom_fields ?? {}, defs);
      let dueAt: Date | null = null;
      if (dto.dueAt) {
        const parsed = new Date(dto.dueAt);
        if (isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid dueAt value');
        }
        dueAt = parsed;
      }

      const { id: ticketId } = await allocateTicketId(tx, tenantId, { id: site.id, name: site.name });

      const t = await tx.ticket.create({
        data: {
          id: ticketId,
          tenantId, siteId: dto.siteId, typeKey: dto.type, description: dto.description,
          status: dto.status, priority: dto.priority, details: dto.details ?? null,
          assignedUserId: dto.assignedUserId ?? null,
          dueAt,
          customFields: dto.custom_fields ?? {} as any,
        }
      });
      await tx.outbox.create({ data: { tenantId, type: 'ticket.created', entityId: t.id, payload: {} }});

      if (t.assignedUserId) {
        await tx.notification.create({
          data: {
            tenantId,
            userId: t.assignedUserId,
            type: NotificationType.TICKET_ASSIGNED,
            title: `Ticket assigned · ${t.id}`,
            message: `You have been assigned "${t.description}"`,
            ticketId: t.id,
            metadata: {
              generatedAt: new Date().toISOString(),
            } as Prisma.JsonObject,
          },
        });
      }
      
      // Record history entry for creation
      await tx.ticketHistory.create({
        data: {
          tenantId,
          ticketId: t.id,
          actorUserId: (global as any).__actorUserId ?? null,
          changes: buildChanges(null, t),
        }
      });
      
      // Notify assigned user if ticket is created with assignment
      if (t.assignedUserId) {
        await this.notificationsService.create({
          tenantId,
          userId: t.assignedUserId,
          type: 'TICKET_ASSIGNED',
          title: 'New Ticket Assigned',
          message: `You have been assigned to ticket ${t.id}: ${t.description}`,
          ticketId: t.id,
        });
      }
      
      return t;
    });
  }

  async list(tenantId: string, q: {
    siteId?: string; status?: TicketStatus; priority?: TicketPriority; type?: string;
    search?: string; cf_key?: string; cf_val?: string; assignedUserId?: string;
    createdFrom?: string; createdTo?: string; limit?: number; cursor?: string;
  }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const where: Prisma.TicketWhereInput = { tenantId };
      if (q.siteId) where.siteId = q.siteId;
      if (q.status) where.status = q.status;
      if (q.priority) where.priority = q.priority;
      if (q.type) where.typeKey = q.type;
      if (q.assignedUserId) where.assignedUserId = q.assignedUserId;
      if (q.search) {
        where.OR = [
          { description: { contains: q.search, mode: 'insensitive' } },
          { details: { contains: q.search, mode: 'insensitive' } },
          { typeKey: { contains: q.search, mode: 'insensitive' } },
        ];
      }
      if (q.cf_key && q.cf_val) {
        // @ts-ignore Prisma JSON filter
        where.AND = [{ customFields: { path: [q.cf_key], equals: q.cf_val } }];
      }
      // Date range filtering
      if (q.createdFrom || q.createdTo) {
        where.createdAt = {};
        if (q.createdFrom) where.createdAt.gte = new Date(q.createdFrom);
        if (q.createdTo) where.createdAt.lte = new Date(q.createdTo);
      }
      const take = Math.min(Number(q.limit ?? 50), 200);
      const feed = await tx.ticket.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      });
      return feed;
    });
  }

  async get(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const t = await tx.ticket.findFirst({ where: { id, tenantId }});
      if (!t) throw new NotFoundException();
      return t;
    });
  }

  private async applyUpdate(
    tx: any,
    tenantId: string,
    id: string,
    patch: Partial<{
      siteId: string; type: string; description: string;
      status: TicketStatus; priority: TicketPriority; details?: string; assignedUserId?: string | null;
      dueAt?: string | null;
      custom_fields: Record<string, unknown>;
    }>
  ) {
    // Fetch the current state before update
    const before = await tx.ticket.findFirst({ where: { id, tenantId } });
    if (!before) throw new NotFoundException();

    if (patch.siteId) {
      const ok = await tx.site.findFirst({ where: { id: patch.siteId, tenantId }});
      if (!ok) throw new BadRequestException('Invalid siteId for tenant');
    }

    // Validate typeKey if provided
    if (patch.type) {
      const issueType = await tx.issueType.findFirst({ where: { tenantId, key: patch.type, active: true }});
      if (!issueType) throw new BadRequestException('Invalid or inactive typeKey for tenant');
    }

    // Validate assignedUserId if provided (allow null/empty to unassign)
    if (patch.assignedUserId !== undefined && patch.assignedUserId !== null && patch.assignedUserId !== '') {
      const user = await tx.user.findFirst({ where: { id: patch.assignedUserId, tenantId }});
      if (!user) throw new BadRequestException('Invalid assignedUserId for tenant');
    }

    if (patch.custom_fields) {
      const defs = await this.loadFieldDefs(tx, tenantId);
      this.validateCustomFields(patch.custom_fields, defs);
    }
    const updateData: any = {};
    if (patch.siteId) updateData.siteId = patch.siteId;
    if (patch.type) updateData.typeKey = patch.type;
    if (patch.description) updateData.description = patch.description;
    if (patch.status) updateData.status = patch.status;
    if (patch.priority) updateData.priority = patch.priority;
    if (patch.details !== undefined) updateData.details = patch.details;
    if (patch.assignedUserId !== undefined) updateData.assignedUserId = patch.assignedUserId || null;
    if (patch.custom_fields) updateData.customFields = patch.custom_fields;
    if (patch.dueAt !== undefined) {
      updateData.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
      if (updateData.dueAt && isNaN(updateData.dueAt.getTime())) {
        throw new BadRequestException('Invalid dueAt value');
      }
    }

    const updated = await tx.ticket.update({
      where: { id },
      data: updateData
    });
    await tx.outbox.create({ data: { tenantId, type: 'ticket.updated', entityId: id, payload: {} }});

    // Record history entry if there are changes
    const changes = buildChanges(before, updated);
    if (Object.keys(changes).length > 0) {
      await tx.ticketHistory.create({
        data: {
          tenantId,
          ticketId: updated.id,
          actorUserId: (global as any).__actorUserId ?? null,
          changes
        }
      });
    }

    // Notify impacted users
    const actorUserId = (global as any).__actorUserId;
    
    // Assignment change notification
    if (changes.assignedUserId) {
      const newAssignee = changes.assignedUserId.to;
      // Only notify if assigned to someone and they're not the one making the change
      if (newAssignee && newAssignee !== actorUserId) {
        await this.notificationsService.create({
          tenantId,
          userId: newAssignee,
          type: 'TICKET_ASSIGNED',
          title: 'Ticket Assigned to You',
          message: `You have been assigned to ticket ${updated.id}: ${updated.description}`,
          ticketId: updated.id,
        });
      }
    }
    
    // Status change to resolved
    if (changes.status && changes.status.to === 'RESOLVED' && updated.assignedUserId && updated.assignedUserId !== actorUserId) {
      await this.notificationsService.create({
        tenantId,
        userId: updated.assignedUserId,
        type: 'TICKET_RESOLVED',
        title: 'Ticket Resolved',
        message: `Ticket ${updated.id} has been resolved: ${updated.description}`,
        ticketId: updated.id,
      });
    }
    
    // General update notification (only if assigned user exists and didn't make the change)
    if (Object.keys(changes).length > 0 && updated.assignedUserId && updated.assignedUserId !== actorUserId && !changes.assignedUserId) {
      await this.notificationsService.create({
        tenantId,
        userId: updated.assignedUserId,
        type: 'TICKET_UPDATED',
        title: 'Ticket Updated',
        message: `Ticket ${updated.id} has been updated: ${updated.description}`,
        ticketId: updated.id,
      });
    }

    return updated;
  }

  async update(tenantId: string, id: string, patch: Partial<{
    siteId: string; type: string; description: string;
    status: TicketStatus; priority: TicketPriority; details?: string; assignedUserId?: string | null;
    dueAt?: string | null;
    custom_fields: Record<string, unknown>;
  }>) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return this.applyUpdate(tx, tenantId, id, patch);
    });
  }

  async bulkUpdate(tenantId: string, ids: string[], patch: Partial<{
    siteId: string; type: string; description: string;
    status: TicketStatus; priority: TicketPriority; details?: string; assignedUserId?: string | null;
    dueAt?: string | null;
    custom_fields: Record<string, unknown>;
  }>) {
    if (!ids || ids.length === 0) return [];
    return this.prisma.withTenant(tenantId, async (tx) => {
      const results = [];
      for (const id of ids) {
        const updated = await this.applyUpdate(tx, tenantId, id, patch);
        results.push(updated);
      }
      return results;
    });
  }

  async bulkDelete(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) return { deleted: 0 };
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.ticket.findMany({
        where: { tenantId, id: { in: ids } },
        select: { id: true },
      });
      if (existing.length === 0) {
        return { deleted: 0 };
      }

      const existingIds: string[] = existing.map(({ id }: { id: string }) => id);

      await tx.ticket.deleteMany({
        where: { tenantId, id: { in: existingIds } },
      });

      await Promise.all(existingIds.map((id: string) =>
        tx.outbox.create({ data: { tenantId, type: 'ticket.deleted', entityId: id, payload: {} }})
      ));

      return { deleted: existingIds.length };
    });
  }

  async history(tenantId: string, ticketId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.ticketHistory.findMany({
        where: { tenantId, ticketId },
        orderBy: { at: 'desc' }
      })
    );
  }
}
