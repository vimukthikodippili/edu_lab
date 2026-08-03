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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { ParentFeedbackService } from './parent-feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RespondToFeedbackDto } from './dto/respond-to-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';

/** P5-PP-03 — FR-P5-PP-12..17. Guardian self-service (submit/mine) resolves via the same inline
 * `guardianRepo.findOne({where:{userId}})` lookup established by `EventRegistrationController`.
 * "Principal or designated staff" maps to `admin, principal` — the same fully-privileged
 * convention used everywhere else this session for an AI-prompt actor with no distinct RoleEnum
 * value; forwarding to a Section Head (FR-P5-PP-13's second half) is explicitly out of scope. */
@ApiTags('Parent Feedback')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'parent-feedback', version: '1' })
export class ParentFeedbackController {
  constructor(
    private readonly feedbackService: ParentFeedbackService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

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

  private async resolveGuardianId(userId: unknown): Promise<string> {
    const guardian = await this.guardianRepo.findOne({ where: { userId: userId as number } });
    if (!guardian) {
      throw new NotFoundException('Your account is not linked to a guardian record.');
    }
    return guardian.id;
  }

  @Post()
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit feedback or a complaint' })
  async create(@Body() dto: CreateFeedbackDto, @Request() req: { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.feedbackService.create(dto, guardianId);
  }

  @Get('mine')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The calling guardian's own feedback submissions, with responses where resolved" })
  async findMine(@Request() req: { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.feedbackService.findMine(guardianId);
  }

  @Get('mine/:id')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A single one of the calling guardian's own feedback submissions" })
  async getMine(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.feedbackService.getMine(id, guardianId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'The Principal feedback dashboard — all submissions, filterable by status/category' })
  async findAll(@Query() filters: QueryFeedbackDto) {
    return this.feedbackService.findAll(filters);
  }

  @Patch(':id/mark-under-review')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a Received item as Under Review' })
  async markUnderReview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.feedbackService.markUnderReview(id, staffId);
  }

  @Post(':id/respond')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Respond to and resolve a feedback item, notifying the guardian' })
  async respond(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RespondToFeedbackDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.feedbackService.respond(id, dto, staffId);
  }
}
