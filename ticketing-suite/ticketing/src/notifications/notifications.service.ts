import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    userId?: string;
    type: string;
    title: string;
    message: string;
    ticketId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.notification.create({
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
    return this.create({
      tenantId,
      userId,
      type,
      title,
      message,
      ticketId,
    });
  }
}
