import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { S3 } from 'aws-sdk';
import { randomUUID } from 'crypto';
@Injectable() export class AttachmentsService {
  private s3 = new S3({ region: process.env.AWS_REGION });
  constructor(private prisma: PrismaService) {}
  private bucket() { const b = process.env.S3_BUCKET; if (!b) throw new Error('S3_BUCKET not configured'); return b; }
  
  async list(tenantId: string, ticketId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const t = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!t) throw new BadRequestException('Invalid ticket');
      const attachments = await tx.attachment.findMany({
        where: { ticketId, tenantId },
        orderBy: { createdAt: 'desc' }
      });
      // Generate presigned download URLs for each attachment
      return attachments.map((att: any) => ({
        id: att.id,
        ticketId: att.ticketId,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        createdAt: att.createdAt,
        downloadUrl: this.s3.getSignedUrl('getObject', {
          Bucket: this.bucket(),
          Key: att.objectKey,
          Expires: 300 // 5 minutes
        })
      }));
    });
  }
  
  async createPresigned(tenantId: string, ticketId: string, filename: string, mime: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const t = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!t) throw new BadRequestException('Invalid ticket');
      const id = randomUUID();
      const key = `tickets/${tenantId}/${ticketId}/${id}-${filename}`;
      const upload_url = this.s3.getSignedUrl('putObject', { Bucket: this.bucket(), Key: key, ContentType: mime, Expires: 600 });
      await tx.attachment.create({ data: { id, tenantId, ticketId, objectKey: key, filename, mimeType: mime, sizeBytes: 0, checksumSha256: '' } });
      return { upload_url, object_key: key, attachment_id: id };
    });
  }
  async finalize(tenantId: string, attachmentId: string, size: number, checksumSha256: string) {
    return this.prisma.withTenant(tenantId, async (tx) => tx.attachment.update({ where: { id: attachmentId }, data: { sizeBytes: size, checksumSha256 } }));
  }

  async delete(tenantId: string, ticketId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const attachment = await tx.attachment.findFirst({ where: { id, tenantId, ticketId }});
      if (!attachment) throw new NotFoundException('Attachment not found');
      await this.s3.deleteObject({ Bucket: this.bucket(), Key: attachment.objectKey }).promise();
      await tx.attachment.delete({ where: { id }});
      return { success: true };
    });
  }
}
