import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, CommentVisibility, NotificationType } from '@prisma/client';
import { PrismaService } from '../infra/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async add(
    tenantId: string,
    ticketId: string,
    authorUserId: string | undefined,
    body: string,
    visibility: CommentVisibility,
    mentions: string[]
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, tenantId },
        select: { id: true, description: true, assignedUserId: true },
      });
      if (!ticket) throw new BadRequestException('Invalid ticket');

      const comment = await tx.comment.create({
        data: { tenantId, ticketId, authorUserId: authorUserId ?? null, body, visibility },
      });
      await tx.outbox.create({
        data: { tenantId, type: 'comment.created', entityId: comment.id, payload: { ticketId, visibility } },
      });

      // Handle mentions (existing functionality)
      const uniqueMentions = Array.from(
        new Set((mentions ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))
      );

      if (uniqueMentions.length > 0) {
        const mentionedUsers = await tx.user.findMany({
          where: { tenantId, id: { in: uniqueMentions } },
          select: { id: true, name: true, email: true },
        });

        let authorDisplay = 'A teammate';
        if (authorUserId) {
          const author = await tx.user.findFirst({
            where: { tenantId, id: authorUserId },
            select: { name: true, email: true },
          });
          if (author) authorDisplay = author.name || author.email || authorDisplay;
        }

        const rows = mentionedUsers
          .filter((user: { id: string; name: string | null; email: string }) => user.id !== authorUserId)
          .map((user: { id: string; name: string | null; email: string }) => ({
            tenantId,
            userId: user.id,
            type: NotificationType.TICKET_COMMENTED,
            title: `Mentioned in ${ticket.id}`,
            message: `${authorDisplay} mentioned you in a comment on ${ticket.id}`,
            ticketId: ticket.id,
            metadata: {
              commentId: comment.id,
              generatedAt: new Date().toISOString(),
            } as Prisma.JsonObject,
          }));

        if (rows.length > 0) {
          await tx.notification.createMany({ data: rows });
        }
      }

      // Notify impacted users (only for public comments) - new functionality
      if (visibility === 'PUBLIC') {
        const usersToNotify = new Set<string>();
        
        // Notify assigned user if they didn't comment
        if (ticket.assignedUserId && ticket.assignedUserId !== authorUserId) {
          usersToNotify.add(ticket.assignedUserId);
        }
        
        // Notify previous commenters (excluding the current commenter)
        const previousComments = await tx.comment.findMany({
          where: { ticketId, tenantId, visibility: 'PUBLIC' },
          select: { authorUserId: true },
          distinct: ['authorUserId'],
        });
        
        for (const prevComment of previousComments) {
          if (prevComment.authorUserId && prevComment.authorUserId !== authorUserId) {
            usersToNotify.add(prevComment.authorUserId);
          }
        }
        
        // Remove mentioned users from general notification (they already got mention notification)
        for (const mentionedId of uniqueMentions) {
          usersToNotify.delete(mentionedId);
        }
        
        // Create notifications for all impacted users (via NotificationsService for email support)
        for (const userId of usersToNotify) {
          await this.notificationsService.create({
            tenantId,
            userId,
            type: 'TICKET_COMMENTED',
            title: 'New Comment on Ticket',
            message: `A new comment was added to ticket ${ticketId}: ${ticket.description}`,
            ticketId,
          });
        }
      }

      return comment;
    });
  }
  async list(tenantId: string, ticketId: string) {
    return this.prisma.withTenant(tenantId, (tx) => tx.comment.findMany({ where: { tenantId, ticketId }, orderBy: { createdAt: 'asc' } }));
  }
  async update(tenantId: string, ticketId: string, id: string, userId: string, body: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const comment = await tx.comment.findFirst({ where: { id, tenantId, ticketId }});
      if (!comment) throw new NotFoundException('Comment not found');
      if (comment.authorUserId !== userId) throw new ForbiddenException('You can only edit your own comments');
      return tx.comment.update({ where: { id }, data: { body }});
    });
  }
  async delete(tenantId: string, ticketId: string, id: string, userId: string, userRole: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const comment = await tx.comment.findFirst({ where: { id, tenantId, ticketId }});
      if (!comment) throw new NotFoundException('Comment not found');
      if (comment.authorUserId !== userId && userRole !== 'ADMIN') {
        throw new ForbiddenException('You can only delete your own comments');
      }
      await tx.comment.delete({ where: { id }});
      return { success: true };
    });
  }
}
