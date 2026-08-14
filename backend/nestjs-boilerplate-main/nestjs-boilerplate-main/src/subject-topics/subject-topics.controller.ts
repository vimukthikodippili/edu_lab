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
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { SubjectTopicsService } from './subject-topics.service';
import { CreateSubjectTopicDto } from './dto/create-subject-topic.dto';
import { RenameSubjectTopicDto } from './dto/rename-subject-topic.dto';
import { ReorderSubjectTopicsDto } from './dto/reorder-subject-topics.dto';
import { QuerySubjectTopicsDto } from './dto/query-subject-topics.dto';

const PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head]);

@ApiTags('Subject Topics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'subject-topics', version: '1' })
export class SubjectTopicsController {
  constructor(
    private readonly subjectTopicsService: SubjectTopicsService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
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

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Get()
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active topics for a subject, self-scoped to the caller (or, for a privileged caller, an explicit teacherId)' })
  async findActive(
    @Query() query: QuerySubjectTopicsDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    const isPrivileged = this.isPrivileged(req);
    const effectiveTeacherId = isPrivileged && query.teacherId ? query.teacherId : staffId;
    return this.subjectTopicsService.findActiveForSubject(
      query.subjectId,
      effectiveTeacherId,
      isPrivileged,
    );
  }

  @Post()
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new topic for a subject (or, for a privileged caller, on an explicit teacherId\'s behalf)' })
  async create(
    @Body() dto: CreateSubjectTopicDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    const isPrivileged = this.isPrivileged(req);
    const effectiveTeacherId = isPrivileged && dto.teacherId ? dto.teacherId : staffId;
    return this.subjectTopicsService.create(
      dto.subjectId,
      effectiveTeacherId,
      dto.title,
      isPrivileged,
    );
  }

  // NOTE: /reorder is registered BEFORE /:id to prevent NestJS from treating it as a UUID param.

  @Patch('reorder')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder a subject\'s topics by providing an ordered array of UUIDs' })
  async reorder(
    @Body() dto: ReorderSubjectTopicsDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.subjectTopicsService.reorder(
      dto.subjectId,
      staffId,
      dto.topicIds,
      this.isPrivileged(req),
    );
  }

  @Patch(':id')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a topic' })
  async rename(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RenameSubjectTopicDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.subjectTopicsService.rename(id, staffId, dto.title, this.isPrivileged(req));
  }

  @Patch(':id/archive')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a topic — never deleted, remains resolvable by id' })
  async archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.subjectTopicsService.archive(id, staffId, this.isPrivileged(req));
  }
}
