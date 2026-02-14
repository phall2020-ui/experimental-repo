import { Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { S3 } from 'aws-sdk';
import { randomUUID } from 'crypto';
@Injectable() export class AttachmentsService {
  private s3: S3 | null = null;
  private s3Available: boolean = false;
  
  constructor(private prisma: PrismaService) {
    // Initialize S3 only if credentials are configured
    if (process.env.S3_BUCKET && process.env.AWS_REGION) {
      try {
        this.s3 = new S3({ region: process.env.AWS_REGION });
        this.s3Available = true;
      } catch (error) {
        console.warn('S3 initialization failed:', error);
        this.s3Available = false;
      }
    }
  }
  
  private checkS3Available() {
    if (!this.s3Available || !this.s3) {
      throw new ServiceUnavailableException('Attachments feature is not available in this environment');
    }
  }
  
  private bucket() { 
    const b = process.env.S3_BUCKET; 
    if (!b) throw new ServiceUnavailableException('S3_BUCKET not configured'); 
    return b; 
  }
  
  async list(tenantId: string, ticketId: string) {
    this.checkS3Available();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const t = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!t) throw new BadRequestException('Invalid ticket');
      const attachments = await tx.attachment.findMany({
        where: { tenantId, ticketId },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          objectKey: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return attachments.map((att: any) => ({
        ...att,
        downloadUrl: this.s3!.getSignedUrl('getObject', { Bucket: this.bucket(), Key: att.objectKey, Expires: 300 })
      }));
    });
  }
  
  async createPresigned(tenantId: string, ticketId: string, filename: string, mime: string) {
    this.checkS3Available();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const t = await tx.ticket.findFirst({ where: { id: ticketId, tenantId }});
      if (!t) throw new BadRequestException('Invalid ticket');
      const id = randomUUID();
      const key = `tickets/${tenantId}/${ticketId}/${id}-${filename}`;
      const upload_url = this.s3!.getSignedUrl('putObject', { Bucket: this.bucket(), Key: key, ContentType: mime, Expires: 600 });
      await tx.attachment.create({ data: { id, tenantId, ticketId, objectKey: key, filename, mimeType: mime, sizeBytes: 0, checksumSha256: '' } });
      return { upload_url, object_key: key, attachment_id: id };
    });
  }
  
  async finalize(tenantId: string, attachmentId: string, size: number, checksumSha256: string) {
    this.checkS3Available();
    return this.prisma.withTenant(tenantId, async (tx) => tx.attachment.update({ where: { id: attachmentId }, data: { sizeBytes: size, checksumSha256 } }));
  }

  async delete(tenantId: string, ticketId: string, id: string) {
    this.checkS3Available();
    return this.prisma.withTenant(tenantId, async (tx) => {
      const attachment = await tx.attachment.findFirst({ where: { id, tenantId, ticketId }});
      if (!attachment) throw new NotFoundException('Attachment not found');
      await this.s3!.deleteObject({ Bucket: this.bucket(), Key: attachment.objectKey }).promise();
      await tx.attachment.delete({ where: { id }});
      return { success: true };
    });
  }
}
