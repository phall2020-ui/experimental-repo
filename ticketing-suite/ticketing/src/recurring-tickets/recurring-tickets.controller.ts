import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
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

  @Get('by-origin/:ticketId')
  @Roles('AssetManager', 'OandM', 'Monitoring', 'Contractor', 'ADMIN', 'USER')
  async findByOrigin(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.service.findByOriginTicketId(this.tenant(req), ticketId);
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

  @Patch('bulk-update')
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async bulkUpdate(@Req() req: any, @Body() body: { ids: string[], updates: any }) {
    try {
      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        throw new HttpException('Invalid or empty IDs array', HttpStatus.BAD_REQUEST);
      }
      if (!body.updates || typeof body.updates !== 'object') {
        throw new HttpException('Invalid updates object', HttpStatus.BAD_REQUEST);
      }
      return this.service.bulkUpdate(this.tenant(req), body.ids, body.updates);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error?.message || 'Bulk update failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bulk-delete')
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async bulkDelete(@Req() req: any, @Body() body: { ids: string[] }) {
    try {
      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        throw new HttpException('Invalid or empty IDs array', HttpStatus.BAD_REQUEST);
      }
      return this.service.bulkDelete(this.tenant(req), body.ids);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error?.message || 'Bulk delete failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('bulk-group')
  @Roles('AssetManager', 'OandM', 'ADMIN')
  async bulkGroup(@Req() req: any, @Body() body: { ids: string[], groupName: string }) {
    try {
      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        throw new HttpException('Invalid or empty IDs array', HttpStatus.BAD_REQUEST);
      }
      return this.service.bulkGroup(this.tenant(req), body.ids, body.groupName);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(error?.message || 'Bulk group failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
