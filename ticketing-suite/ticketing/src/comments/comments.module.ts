import { Module } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ 
  imports: [NotificationsModule],
  controllers: [CommentsController], 
  providers: [CommentsService, PrismaService] 
})
export class CommentsModule {}
