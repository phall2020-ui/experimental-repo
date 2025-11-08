import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CommentVisibility } from '@prisma/client';
@Injectable() export class CommentsService {
  constructor(private prisma: PrismaService) {}
  async add(tenantId: string, ticketId: string, authorUserId: string | undefined, body: string, visibility: CommentVisibility) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exists = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!exists) throw new BadRequestException('Invalid ticket');
      const c = await tx.comment.create({ data: { tenantId, ticketId, authorUserId: authorUserId ?? null, body, visibility } });
      await tx.outbox.create({ data: { tenantId, type: 'comment.created', entityId: c.id, payload: { ticketId, visibility } }});
      return c;
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
