import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: any, createdBy: string) {
    return this.prisma.ticketTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        typeKey: dto.typeKey,
        description: dto.description,
        details: dto.details,
        priority: dto.priority,
        status: dto.status,
        assignedUserId: dto.assignedUserId,
        customFields: dto.customFields || {},
        isRecurring: dto.isRecurring || false,
        frequency: dto.frequency,
        intervalValue: dto.intervalValue,
        leadTimeDays: dto.leadTimeDays,
        createdBy,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.ticketTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.ticketTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async remove(tenantId: string, id: string) {
    const template = await this.prisma.ticketTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('Template not found');
    
    await this.prisma.ticketTemplate.delete({
      where: { id },
    });
    
    return { success: true };
  }
}
