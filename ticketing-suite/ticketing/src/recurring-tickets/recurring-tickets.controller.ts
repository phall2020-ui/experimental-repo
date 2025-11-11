import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { RecurringTicketsService } from './recurring-tickets.service';
import { CreateRecurringTicketDto } from './dto/create-recurring-ticket.dto';
import { UpdateRecurringTicketDto } from './dto/update-recurring-ticket.dto';
import { JwtAuthGuard } from '../common/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recurring-tickets')
export class RecurringTicketsController {
  constructor(private readonly service: RecurringTicketsService) {}

  private tenant(req: any) {
    return req.user.tenantId;
  }

  @Post()
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async create(@Req() req: any, @Body() dto: CreateRecurringTicketDto) {
    return this.service.create(this.tenant(req), dto);
  }

  @Get()
  @Roles('AssetManager', 'OandM', 'Monitoring', 'Contractor', 'ADMIN', 'USER')
  async findAll(@Req() req: any, @Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAll(this.tenant(req), active);
  }

  @Get(':id')
  @Roles('AssetManager', 'OandM', 'Monitoring', 'Contractor', 'ADMIN', 'USER')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(this.tenant(req), id);
  }

  @Patch(':id')
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRecurringTicketDto) {
    return this.service.update(this.tenant(req), id, dto);
  }

  @Delete(':id')
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(this.tenant(req), id);
  }

  @Post('process')
  @Roles('ADMIN')
  async processRecurringTickets() {
    return this.service.processRecurringTickets();
  }
}
