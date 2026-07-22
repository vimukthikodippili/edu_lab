import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StudentSportsService } from './student-sports.service';

@ApiTags('Sports — Student/Guardian Self-View')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'sports', version: '1' })
export class StudentSportsController {
  constructor(
    private readonly studentSportsService: StudentSportsService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,
  ) {}

  /**
   * Resolves which studentId the caller is actually allowed to view sports performance for —
   * never trusts the client-supplied `studentId` query param at face value. A student caller
   * defaults to their own record when the param is omitted, but — unlike the silent-override
   * precedent in ResultsController — is REJECTED with a 403 if they supply a studentId that
   * doesn't match their own (the literal ask: "the student endpoint rejects requests where the
   * queried studentId does not match the authenticated user"). A guardian caller must specify
   * one of their own linked children, or is rejected with a 403.
   */
  private async resolveViewableStudentId(
    req: { user: { id: unknown; role?: { id?: number } } },
    requestedStudentId?: string,
  ): Promise<string> {
    const roleId = req.user.role?.id;

    if (String(roleId) === String(RoleEnum.student)) {
      const student = await this.studentRepo.findOne({
        where: { userId: req.user.id as number },
      });
      if (!student) {
        throw new NotFoundException(
          'Your account is not yet linked to a student record — contact your school administrator.',
        );
      }
      if (requestedStudentId && requestedStudentId !== student.id) {
        throw new ForbiddenException(
          'You are not authorized to view another student\'s performance data.',
        );
      }
      return student.id;
    }

    const guardian = await this.guardianRepo.findOne({
      where: { userId: req.user.id as number },
    });
    if (!guardian) {
      throw new NotFoundException(
        'Your account is not yet linked to a guardian record — contact your school administrator.',
      );
    }
    if (!requestedStudentId) {
      throw new ForbiddenException('A studentId is required to view a child\'s performance data.');
    }
    const links = await this.sgRepo.find({ where: { guardianId: guardian.id } });
    const allowedStudentIds = links.map((l) => l.studentId);
    if (!allowedStudentIds.includes(requestedStudentId)) {
      throw new ForbiddenException(
        'You are not authorized to view performance data for this student.',
      );
    }
    return requestedStudentId;
  }

  @Get('my-performance')
  @Roles(RoleEnum.student, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Sports performance profile for the logged-in student, or (via ?studentId=) a guardian\'s linked child',
  })
  async getMyPerformance(
    @Query('studentId') studentId: string | undefined,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const resolvedStudentId = await this.resolveViewableStudentId(req, studentId);
    return this.studentSportsService.getMyProfile(resolvedStudentId);
  }
}
