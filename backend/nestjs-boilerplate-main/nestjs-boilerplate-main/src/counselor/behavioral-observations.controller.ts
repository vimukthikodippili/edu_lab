import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { BehavioralObservationsService } from './behavioral-observations.service';
import { CreateBehavioralObservationDto } from './dto/create-behavioral-observation.dto';

@ApiTags('Behavioral Observations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'behavioral-observations', version: '1' })
export class BehavioralObservationsController {
  constructor(
    private readonly observationsService: BehavioralObservationsService,
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

  @Post()
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBehavioralObservationDto,
    @Request() req: { user: { id: string } },
  ) {
    const authorStaffId = await this.resolveStaffId(req.user.id);
    return this.observationsService.create(dto.studentId, authorStaffId, dto.notes);
  }

  // Deliberately no @Roles(RoleEnum.teacher) here — a teacher can log an
  // observation but cannot read any observation back, including their own.
  @Get('student/:studentId')
  @Roles(RoleEnum.principal, RoleEnum.counselor)
  @HttpCode(HttpStatus.OK)
  async findForStudent(@Param('studentId') studentId: string) {
    return this.observationsService.findForStudent(studentId);
  }
}
