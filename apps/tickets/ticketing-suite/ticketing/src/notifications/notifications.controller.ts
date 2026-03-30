import { Controller, Get, Post, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  private tenant(req: any) {
    return req.user.tenantId;
  }

  private userId(req: any) {
    return req.user.userId;
  }

  @Get()
  async findAll(@Req() req: any, @Query('unreadOnly') unreadOnly?: string) {
    const unread = unreadOnly === 'true';
    return this.service.findAll(this.tenant(req), this.userId(req), unread);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.service.getUnreadCount(this.tenant(req), this.userId(req));
    return { count };
  }

  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markAsRead(this.tenant(req), id);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(this.tenant(req), this.userId(req));
  }

  @Post('daily-refresh')
  async dailyRefresh(@Req() req: any) {
    const userId = this.userId(req);
    if (!userId) {
      return { ran: false, dueSoon: 0, updates: 0 };
    }
    return this.service.dailyRefresh(this.tenant(req), userId);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(this.tenant(req), id);
  }
}
