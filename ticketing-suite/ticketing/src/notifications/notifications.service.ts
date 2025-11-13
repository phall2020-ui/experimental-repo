import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { Prisma, NotificationType, TicketStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async create(data: {
    tenantId: string;
    userId?: string;
    type: string;
    title: string;
    message: string;
    ticketId?: string;
    metadata?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        ticketId: data.ticketId,
        metadata: data.metadata || {},
      },
    });

    // Send email notification if user is specified
    if (data.userId && data.ticketId) {
      try {
        // Get user details for email
        const user = await this.prisma.user.findFirst({
          where: { id: data.userId, tenantId: data.tenantId },
          select: { email: true, name: true },
        });
        
        if (user) {
          await this.emailService.sendTicketNotification(
            user.email,
            user.name || user.email,
            data.type,
            data.ticketId,
            data.title,
            data.message,
          );
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
        // Don't fail the notification creation if email fails
      }
    }

    return notification;
  }

  async findAll(tenantId: string, userId?: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        ...(userId && { userId }),
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(tenantId: string, userId?: string) {
    return this.prisma.notification.count({
      where: {
        tenantId,
        ...(userId && { userId }),
        isRead: false,
      },
    });
  }

  async markAsRead(tenantId: string, id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        ...(userId && { userId }),
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // Helper method to create ticket-related notifications
  async notifyTicketUpdate(
    tenantId: string,
    ticketId: string,
    type: string,
    title: string,
    message: string,
    userId?: string
  ) {
    const notification = await this.create({
      tenantId,
      userId,
      type,
      title,
      message,
      ticketId,
    });

    // Send email if user has email notifications enabled for this type
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailNotifications: true }
      });

      if (user && user.emailNotifications) {
        const emailPrefs = user.emailNotifications as Record<string, boolean>;
        const typeKey = this.getNotificationTypeKey(type);
        
        // Only send email if preferences exist and this type is enabled
        if (emailPrefs && typeof emailPrefs[typeKey] === 'boolean' && emailPrefs[typeKey]) {
          await this.emailService.sendTicketNotification(
            user.email,
            user.name,
            type,
            ticketId,
            title,
            message
          );
        }
      }
    }

    return notification;
  }

  private getNotificationTypeKey(type: string): string {
    const typeMap: Record<string, string> = {
      TICKET_CREATED: 'ticketCreated',
      TICKET_UPDATED: 'ticketUpdated',
      TICKET_ASSIGNED: 'ticketAssigned',
      TICKET_COMMENTED: 'ticketCommented',
      TICKET_RESOLVED: 'ticketResolved',
    };
    // Return undefined if type is not recognized, so email won't be sent for unknown types
    return typeMap[type] || '';
  }

  async dailyRefresh(tenantId: string, userId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return this.prisma.$transaction(async (tx) => {
      const digest = await tx.notificationDigest.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });

      const alreadyRanToday =
        digest?.lastRunAt &&
        digest.lastRunAt >= startOfToday &&
        digest.lastRunAt < startOfTomorrow;

      const since = digest?.lastRunAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let dueSoonCount = 0;
      let updatesCount = 0;

      if (!alreadyRanToday) {
        // Clear previous digest notifications so we only show the most recent snapshot
        await tx.notification.deleteMany({
          where: {
            tenantId,
            userId,
            type: { in: [NotificationType.TICKET_DUE_SOON, NotificationType.TICKET_ACTIVITY_DIGEST] },
          },
        });

        const weekAhead = new Date(startOfToday);
        weekAhead.setDate(weekAhead.getDate() + 7);

        const dueSoonTickets = await tx.ticket.findMany({
          where: {
            tenantId,
            assignedUserId: userId,
            status: { not: TicketStatus.CLOSED },
            dueAt: {
              gte: startOfToday,
              lt: weekAhead,
            },
          },
          select: {
            id: true,
            description: true,
            dueAt: true,
            site: { select: { name: true } },
          },
        });

        if (dueSoonTickets.length > 0) {
          dueSoonCount = dueSoonTickets.length;
          await tx.notification.createMany({
            data: dueSoonTickets.map((ticket) => ({
              tenantId,
              userId,
              type: NotificationType.TICKET_DUE_SOON,
              title: `Upcoming due date · ${ticket.id}`,
              message: `${ticket.description} is due on ${ticket.dueAt?.toLocaleDateString()}${ticket.site?.name ? ` · ${ticket.site.name}` : ''}`,
              ticketId: ticket.id,
              metadata: {
                dueAt: ticket.dueAt?.toISOString() ?? null,
                generatedAt: now.toISOString(),
              } as Prisma.JsonObject,
            })),
          });
        }

        const recentUpdates = await tx.ticketHistory.findMany({
          where: {
            tenantId,
            at: { gt: since },
            OR: [
              { actorUserId: { not: userId } },
              { actorUserId: null },
            ],
            ticket: {
              tenantId,
              assignedUserId: userId,
              status: { not: TicketStatus.CLOSED },
            },
          },
          orderBy: { at: 'desc' },
          include: {
            ticket: { select: { id: true, description: true, dueAt: true, site: { select: { name: true } } } },
          },
        });

        if (recentUpdates.length > 0) {
          const updateMap = new Map<
            string,
            {
              ticketId: string;
              title: string;
              message: string;
              latestAt: Date;
            }
          >();

          for (const entry of recentUpdates) {
            if (!entry.ticket) continue;
            const ticketId = entry.ticket.id;
            const existing = updateMap.get(ticketId);
            const changeKeys = Object.keys((entry.changes as Prisma.JsonObject) ?? {});
            const fieldList = changeKeys.length > 0 ? changeKeys.join(', ') : 'ticket';
            const baseMessage = `${entry.ticket.description} updated (${fieldList})`;
            const title = `Updates while you were away · ${ticketId}`;

            if (!existing || existing.latestAt < entry.at) {
              updateMap.set(ticketId, {
                ticketId,
                title,
                message: `${baseMessage} at ${entry.at.toLocaleString()}`,
                latestAt: entry.at,
              });
            }
          }

          const updates = Array.from(updateMap.values());
          if (updates.length > 0) {
            updatesCount = updates.length;
            await tx.notification.createMany({
              data: updates.map((item) => ({
                tenantId,
                userId,
                type: NotificationType.TICKET_ACTIVITY_DIGEST,
                title: item.title,
                message: item.message,
                ticketId: item.ticketId,
                metadata: {
                  generatedAt: now.toISOString(),
                } as Prisma.JsonObject,
              })),
            });
          }
        }

        await tx.notificationDigest.upsert({
          where: { tenantId_userId: { tenantId, userId } },
          create: { tenantId, userId, lastRunAt: now },
          update: { lastRunAt: now },
        });
      }

      return {
        ran: !alreadyRanToday,
        dueSoon: dueSoonCount,
        updates: updatesCount,
      };
    });
  }
}
