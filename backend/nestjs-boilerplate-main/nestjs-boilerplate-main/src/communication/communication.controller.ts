import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import {
  CommunicationService,
  SendAlertSummary,
} from './communication.service';
import { SendEmergencyAlertDto } from './dto/send-emergency-alert.dto';
import { NotificationLogEntity } from './entities/notification-log.entity';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'communication', version: '1' })
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException(
        'No staff record linked to your account.',
      );
    return staff.id;
  }

  @Post('alerts')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Send an emergency alert to all active guardians and staff via SMS, push, and email',
  })
  async sendAlert(
    @Body() dto: SendEmergencyAlertDto,
    @Request() req: { user: { id: unknown } },
  ): Promise<SendAlertSummary> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.communicationService.sendEmergencyAlert(dto.message, staffId);
  }

  @Get('logs')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get delivery logs for a specific emergency alert' })
  @ApiQuery({ name: 'alertId', type: String, description: 'UUID of the alert' })
  async getLogs(
    @Query('alertId') alertId: string,
  ): Promise<NotificationLogEntity[]> {
    return this.communicationService.getAlertLogs(alertId);
  }
}
