import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { ClassCheckInService } from './class-check-in.service';
import { AuditClassCheckInQueryDto } from './dto/audit-class-check-in-query.dto';
import { ClassCheckInEntity } from './entities/class-check-in.entity';

@ApiTags('Class Check-In')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'check-in', version: '1' })
export class ClassCheckInController {
  constructor(
    private readonly classCheckInService: ClassCheckInService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new Error('User email not found');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new Error('Staff record not found for this user');
    return staff.id;
  }

  @Get('status')
  @Roles(RoleEnum.teacher)
  async getStatus(@Request() req: { user: { id: string } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    const status = await this.classCheckInService.getActiveEntryForTeacher(staffId);

    if (!status) {
      return { isActive: false, alreadyCheckedIn: false, timetableEntry: null };
    }

    return {
      isActive: true,
      alreadyCheckedIn: status.alreadyCheckedIn,
      timetableEntry: {
        id: status.entry.id,
        period: status.entry.period,
        subjectName: status.entry.subject.name,
        classSectionName: status.entry.classSection.name,
      },
    };
  }

  @Post()
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Request() req: { user: { id: string } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.classCheckInService.checkIn(staffId);
  }

  @Post('room/:roomId')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  async checkInByRoom(
    @Param('roomId') roomId: string,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.classCheckInService.checkInByRoom(staffId, roomId);
  }

  @Get('audit')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  async audit(
    @Query() query: AuditClassCheckInQueryDto,
  ): Promise<ClassCheckInEntity[]> {
    return this.classCheckInService.findForAudit(query);
  }

  @Patch(':id')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  update(): never {
    throw new MethodNotAllowedException(
      'ClassCheckIn records are append-only and cannot be updated.',
    );
  }

  @Delete(':id')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  remove(): never {
    throw new MethodNotAllowedException(
      'ClassCheckIn records are append-only and cannot be deleted.',
    );
  }
}
