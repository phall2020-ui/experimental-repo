import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './infra/prisma.service';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { HealthModule } from './health/health.module';
import { DirectoryModule } from './directory/directory.module';
import { FeaturesModule } from './features/features.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60, limit: 120 }]),
    AuthModule,
    TicketsModule,
    CommentsModule,
    AttachmentsModule,
    HealthModule,
    DirectoryModule,
    FeaturesModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
