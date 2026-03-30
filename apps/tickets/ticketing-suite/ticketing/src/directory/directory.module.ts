import { Module } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { PrismaService } from '../infra/prisma.service';

@Module({
  controllers: [DirectoryController],
  providers: [PrismaService]
})
export class DirectoryModule {}
