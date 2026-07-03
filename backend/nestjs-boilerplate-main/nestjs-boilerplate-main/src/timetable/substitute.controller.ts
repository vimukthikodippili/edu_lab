import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { SubstituteService } from './substitute.service';
import { AssignSubstituteDto } from './dto/assign-substitute.dto';

@ApiTags('Substitute Assignments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'substitute-assignments', version: '1' })
export class SubstituteController {
  constructor(
    private readonly substituteService: SubstituteService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new UnprocessableEntityException('User account has no email.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @ApiOperation({ summary: 'List substitute assignments (optionally filter by status)' })
  async findAll(@Query('status') status?: string) {
    return this.substituteService.findAll(status);
  }

  @Post('reprocess/:leaveRequestId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocess substitute suggestions for an approved leave request' })
  async reprocess(
    @Param('leaveRequestId', ParseUUIDPipe) leaveRequestId: string,
  ) {
    return this.substituteService.reprocessLeave(leaveRequestId);
  }

  @Post(':id/assign')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign (or override) a substitute for a timetable slot' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSubstituteDto,
    @Request() req: { user: { id: string } },
  ) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.substituteService.assign(id, dto.substituteStaffId, actorStaffId);
  }
}
