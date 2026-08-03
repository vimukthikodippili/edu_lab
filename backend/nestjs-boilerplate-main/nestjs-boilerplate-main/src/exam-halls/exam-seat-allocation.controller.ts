import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { ExamSeatAllocationService } from './exam-seat-allocation.service';
import { AutoAllocateDto } from './dto/auto-allocate.dto';
import { OverrideSeatDto } from './dto/override-seat.dto';

const FULLY_PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);
const SECTION_HEAD_ROLE = RoleEnum.section_head;

/** P5-EH — FR-P5-EH-04/05/06/07/08/09. Shares the `exams` path prefix with `ExamController` —
 * distinct segment shapes (`:examId/allocate`, `:examId/allocations`, `:examId/my-admit-card`,
 * `:examId/guardian/:studentId/admit-card`) mean no route-collision risk regardless of
 * registration order, matching the established multi-controller-same-prefix convention. */
@ApiTags('Exam Halls — Seat Allocation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'exams', version: '1' })
export class ExamSeatAllocationController {
  constructor(
    private readonly allocationService: ExamSeatAllocationService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException('No staff record linked to your account.');
    }
    return staff.id;
  }

  private async resolveStudentId(userId: unknown): Promise<string> {
    const student = await this.studentRepo.findOne({ where: { userId: userId as number } });
    if (!student) {
      throw new NotFoundException('Your account is not linked to a student record — contact your school administrator.');
    }
    return student.id;
  }

  private async resolveGuardianId(userId: unknown): Promise<string> {
    const guardian = await this.guardianRepo.findOne({ where: { userId: userId as number } });
    if (!guardian) {
      throw new NotFoundException('Your account is not yet linked to a guardian record — contact your school administrator.');
    }
    return guardian.id;
  }

  private isFullyPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && FULLY_PRIVILEGED_ROLES.has(roleId);
  }

  private isSectionHead(req: { user: { role?: { id?: number } } }): boolean {
    return req.user.role?.id === SECTION_HEAD_ROLE;
  }

  @Post(':examId/allocate')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-allocate every enrolled student to a seat across available halls' })
  async allocate(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Body() dto: AutoAllocateDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.allocationService.autoAllocate(
      examId,
      dto,
      staffId,
      this.isFullyPrivileged(req),
      this.isSectionHead(req),
    );
  }

  @Get(':examId/allocations')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seating roster for this exam' })
  async listAllocations(@Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string) {
    return this.allocationService.listAllocations(examId);
  }

  @Patch(':examId/allocations/:id/override')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manually reassign one student's seat" })
  async override(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) allocationId: string,
    @Body() dto: OverrideSeatDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.allocationService.overrideSeat(
      examId,
      allocationId,
      dto,
      staffId,
      this.isFullyPrivileged(req),
      this.isSectionHead(req),
    );
  }

  @Get('students/me/admit-cards')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Every exam I currently have a seat allocation for' })
  async myAdmitCards(@Request() req: { user: { id: unknown } }) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.allocationService.getMyAdmitCards(studentId);
  }

  @Get('guardian/:studentId/admit-cards')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Every exam my linked child currently has a seat allocation for" })
  async childAdmitCards(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.allocationService.getChildAdmitCards(studentId, guardianId);
  }

  @Get(':examId/my-admit-card')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My own admit card for this exam' })
  async myAdmitCard(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.allocationService.getMyAdmitCard(examId, studentId);
  }

  @Get(':examId/guardian/:studentId/admit-card')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "My linked child's admit card for this exam" })
  async childAdmitCard(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.allocationService.getChildAdmitCard(examId, studentId, guardianId);
  }
}
