import { Module } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
@Module({ controllers: [AttachmentsController], providers: [AttachmentsService, PrismaService] })
export class AttachmentsModule {}
