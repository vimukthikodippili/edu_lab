import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @ApiOperation({ summary: 'List notifications for a staff member' })
  @ApiQuery({ name: 'staffId', type: String, description: 'Staff UUID' })
  @Get()
  list(@Query('staffId', ParseUUIDPipe) staffId: string) {
    return this.service.findForStaff(staffId);
  }

  @ApiOperation({ summary: 'Get unread notification count for a staff member' })
  @ApiQuery({ name: 'staffId', type: String, description: 'Staff UUID' })
  @Get('unread-count')
  unreadCount(@Query('staffId', ParseUUIDPipe) staffId: string) {
    return this.service.getUnreadCount(staffId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.service.markRead(id, staffId);
  }
}
