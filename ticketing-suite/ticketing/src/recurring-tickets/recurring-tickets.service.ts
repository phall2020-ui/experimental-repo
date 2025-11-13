import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateRecurringTicketDto } from './dto/create-recurring-ticket.dto';
import { UpdateRecurringTicketDto } from './dto/update-recurring-ticket.dto';

@Injectable()
export class RecurringTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketsService: TicketsService,
  ) {}

  async create(tenantId: string, dto: CreateRecurringTicketDto) {
    const nextScheduledAt = this.calculateNextScheduledDate(
      new Date(dto.startDate),
      dto.frequency,
      dto.intervalValue,
      dto.leadTimeDays
    );

    return this.prisma.recurringTicket.create({
      data: {
        tenantId,
        originTicketId: dto.originTicketId,
        siteId: dto.siteId,
        typeKey: dto.typeKey,
        description: dto.description,
        priority: dto.priority as any,
        details: dto.details,
        assignedUserId: dto.assignedUserId,
        customFields: dto.customFields || {},
        frequency: dto.frequency,
        intervalValue: dto.intervalValue,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        leadTimeDays: dto.leadTimeDays,
        isActive: dto.isActive ?? true,
        nextScheduledAt,
      },
    });
  }

  async findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.recurringTicket.findMany({
      where: {
        tenantId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { nextScheduledAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.recurringTicket.findFirst({
      where: { id, tenantId },
    });
  }

  async findByOriginTicketId(tenantId: string, ticketId: string) {
    return this.prisma.recurringTicket.findFirst({
      where: {
        tenantId,
        originTicketId: ticketId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRecurringTicketDto) {
    const updateData: any = { ...dto };

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    // Recalculate next scheduled date if frequency or interval changed
    if (dto.frequency || dto.intervalValue || dto.leadTimeDays || dto.startDate) {
      const existing = await this.findOne(tenantId, id);
      if (existing) {
        updateData.nextScheduledAt = this.calculateNextScheduledDate(
          dto.startDate ? new Date(dto.startDate) : existing.startDate,
          dto.frequency || existing.frequency,
          dto.intervalValue || existing.intervalValue,
          dto.leadTimeDays ?? existing.leadTimeDays
        );
      }
    }

    return this.prisma.recurringTicket.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.recurringTicket.delete({
      where: { id },
    });
  }

  private calculateNextScheduledDate(
    startDate: Date,
    frequency: string,
    intervalValue: number,
    leadTimeDays: number
  ): Date {
    const now = new Date();
    let nextDate = new Date(startDate);

    // Calculate the next occurrence based on frequency
    while (nextDate <= now) {
      switch (frequency) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + intervalValue);
          break;
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + (intervalValue * 7));
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + intervalValue);
          break;
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + (intervalValue * 3));
          break;
        case 'YEARLY':
          nextDate.setFullYear(nextDate.getFullYear() + intervalValue);
          break;
      }
    }

    // Subtract lead time days
    const scheduledDate = new Date(nextDate);
    scheduledDate.setDate(scheduledDate.getDate() - leadTimeDays);

    return scheduledDate;
  }

  async processRecurringTickets() {
    const now = new Date();
    
    const dueRecurringTickets = await this.prisma.recurringTicket.findMany({
      where: {
        isActive: true,
        nextScheduledAt: { lte: now },
      },
    });

    for (const recurring of dueRecurringTickets) {
      // Generate the ticket
      await this.generateTicketFromRecurring(recurring);

      // Calculate next scheduled date
      const nextScheduledAt = this.calculateNextScheduledDate(
        recurring.startDate,
        recurring.frequency,
        recurring.intervalValue,
        recurring.leadTimeDays
      );

      // Update recurring ticket
      await this.prisma.recurringTicket.update({
        where: { id: recurring.id },
        data: {
          lastGeneratedAt: now,
          nextScheduledAt,
        },
      });
    }

    return { processed: dueRecurringTickets.length };
  }

  private async generateTicketFromRecurring(recurring: any) {
    const ticket = await this.ticketsService.create(recurring.tenantId, {
      siteId: recurring.siteId,
      type: recurring.typeKey,
      description: `[Recurring] ${recurring.description}`,
      status: 'AWAITING_RESPONSE',
      priority: recurring.priority,
      details: recurring.details,
      assignedUserId: recurring.assignedUserId,
      custom_fields: recurring.customFields,
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        tenantId: recurring.tenantId,
        userId: recurring.assignedUserId,
        type: 'RECURRING_TICKET_GENERATED',
        title: 'Recurring Ticket Generated',
        message: `A recurring ticket has been generated: ${recurring.description}`,
        ticketId: ticket.id,
        metadata: { recurringTicketId: recurring.id },
      },
    });

    return ticket;
  }
}
