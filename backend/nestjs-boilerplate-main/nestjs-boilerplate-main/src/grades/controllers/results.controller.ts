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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { ResultsQueryService } from '../services/results-query.service';
import { ResultPublishingService } from '../services/result-publishing.service';
import { PublishResultsDto } from '../dto/publish-results.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Results')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/results', version: '1' })
export class ResultsController {
  constructor(
    private readonly resultsQueryService: ResultsQueryService,
    private readonly resultPublishingService: ResultPublishingService,
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

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Get('subject')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a student's computed result for one subject" })
  async getSubjectResult(
    @Query('studentId') studentId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getSubjectResult(
      studentId,
      subjectId,
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('term')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a student's computed result for a term" })
  async getTermResult(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getTermResult(
      studentId,
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('class')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the ranked class results for a term' })
  async getClassResults(
    @Query('classSectionId') classSectionId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getClassResults(
      Number(classSectionId),
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('published')
  @Roles(RoleEnum.student, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a student's published term result — student/guardian portal only",
  })
  async getPublishedTermResult(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
  ) {
    const result =
      await this.resultPublishingService.getPublishedTermResultForStudent(
        studentId,
        Number(termId),
      );
    if (!result) {
      throw new NotFoundException(
        'No published result found for the given student and term.',
      );
    }
    return result;
  }

  @Get('published/subjects')
  @Roles(RoleEnum.student, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a student's published subject results — student/guardian portal only",
  })
  async getPublishedSubjectResults(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
  ) {
    return this.resultPublishingService.getPublishedSubjectResultsForStudent(
      studentId,
      Number(termId),
    );
  }

  @Post('publish')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publish all complete term results for a class section and term (Principal/Exam Admin only)',
  })
  async publishResults(@Body() dto: PublishResultsDto) {
    return this.resultPublishingService.publishClassResults(
      dto.classSectionId,
      dto.termId,
    );
  }
}
