import { Module } from '@nestjs/common';
import { RecurringTicketsController } from './recurring-tickets.controller';
import { RecurringTicketsService } from './recurring-tickets.service';
import { PrismaModule } from '../infra/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringTicketsController],
  providers: [RecurringTicketsService],
  exports: [RecurringTicketsService],
})
export class RecurringTicketsModule {}
