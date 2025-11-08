import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { Prisma, TicketStatus, TicketPriority } from '@prisma/client';

type CFDefs = Record<string, {
  datatype: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  enumOptions?: string[];
  validation?: Record<string, unknown>;
}>;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

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
    custom_fields?: Record<string, unknown>;
  }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const site = await tx.site.findFirst({ where: { id: dto.siteId, tenantId }});
      if (!site) throw new BadRequestException('Invalid siteId for tenant');
      const defs = await this.loadFieldDefs(tx, tenantId);
      this.validateCustomFields(dto.custom_fields ?? {}, defs);
      const t = await tx.ticket.create({
        data: {
          tenantId, siteId: dto.siteId, typeKey: dto.type, description: dto.description,
          status: dto.status, priority: dto.priority, details: dto.details ?? null,
          assignedUserId: dto.assignedUserId ?? null,
          customFields: dto.custom_fields ?? {} as any,
        }
      });
      await tx.outbox.create({ data: { tenantId, type: 'ticket.created', entityId: t.id, payload: {} }});
      return t;
    });
  }

  async list(tenantId: string, q: {
    siteId?: string; status?: TicketStatus; priority?: TicketPriority; type?: string;
    search?: string; cf_key?: string; cf_val?: string; limit?: number; cursor?: string;
  }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const where: Prisma.TicketWhereInput = { tenantId };
      if (q.siteId) where.siteId = q.siteId;
      if (q.status) where.status = q.status;
      if (q.priority) where.priority = q.priority;
      if (q.type) where.typeKey = q.type;
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

  async update(tenantId: string, id: string, patch: Partial<{
    siteId: string; type: string; description: string;
    status: TicketStatus; priority: TicketPriority; details?: string; assignedUserId?: string;
    custom_fields: Record<string, unknown>;
  }>) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      if (patch.siteId) {
        const ok = await tx.site.findFirst({ where: { id: patch.siteId, tenantId }});
        if (!ok) throw new BadRequestException('Invalid siteId for tenant');
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
      
      const updated = await tx.ticket.update({
        where: { id },
        data: updateData
      });
      await tx.outbox.create({ data: { tenantId, type: 'ticket.updated', entityId: id, payload: {} }});
      return updated;
    });
  }
}
