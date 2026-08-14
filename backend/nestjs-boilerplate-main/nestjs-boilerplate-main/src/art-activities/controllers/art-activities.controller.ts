import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { ArtActivitiesService } from '../services/art-activities.service';
import { CreateArtActivityDto } from '../dto/create-art-activity.dto';
import { BulkPreCheckDto } from '../dto/bulk-pre-check.dto';
import { BulkPostCheckDto } from '../dto/bulk-post-check.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Art Activities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'art-activities', version: '1' })
export class ArtActivitiesController {
  constructor(
    private readonly artActivitiesService: ArtActivitiesService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Post()
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new art/painting activity for a class section' })
  async create(
    @Body() dto: CreateArtActivityDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.artActivitiesService.createActivity(dto, staffId, this.isPrivileged(req));
  }

  @Get()
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List art activities for a class section, newest first' })
  list(@Query('classSectionId', ParseIntPipe) classSectionId: number) {
    return this.artActivitiesService.listActivities(classSectionId);
  }

  @Get(':id/roster')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Roster with before/after color-check status per student' })
  getRoster(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.artActivitiesService.getRoster(id);
  }

  @Post(':id/pre-check/bulk')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Before drawing: confirm which students have all their colors' })
  async bulkPreCheck(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: BulkPreCheckDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.artActivitiesService.bulkPreCheck(id, dto, staffId, this.isPrivileged(req));
  }

  @Post(':id/post-check/bulk')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'After drawing: record which colors each student used' })
  async bulkPostCheck(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: BulkPostCheckDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.artActivitiesService.bulkPostCheck(id, dto, staffId, this.isPrivileged(req));
  }
}
