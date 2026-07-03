import {
  Body,
  Controller,
  Delete,
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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffRolesDto } from './dto/update-staff-roles.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UsersService } from '../users/users.service';
import { SetStaffPasswordDto } from './dto/set-staff-password.dto';
import { ChangeSystemRoleDto } from './dto/change-system-role.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'staff', version: '1' })
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff member created.' })
  @ApiResponse({ status: 409, description: 'Duplicate email or NIC.' })
  @ApiResponse({ status: 422, description: 'Invalid photoId or empty roles array.' })
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List staff with optional search/filter/pagination' })
  findMany(@Query() query: QueryStaffDto) {
    return this.staffService.findMany(query);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the staff record for the currently authenticated user (matched by email)' })
  @ApiResponse({ status: 200, description: 'Staff record for the current user.' })
  @ApiResponse({ status: 404, description: 'No staff record linked to this user email.' })
  async me(@Request() req: { user: { id: string } }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new NotFoundException('No staff record linked to your account email.');
    return staff;
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a staff member profile by UUID' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.staffService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update staff profile fields' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  @ApiResponse({ status: 409, description: 'Duplicate email or NIC.' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, dto);
  }

  @Patch(':id/roles')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all functional role assignments for a staff member' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  updateRoles(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateStaffRolesDto,
  ) {
    return this.staffService.updateRoles(id, dto);
  }

  @Post(':id/set-password')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set or reset the password for the user account linked to this staff member' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 204, description: 'Password updated.' })
  @ApiResponse({ status: 404, description: 'Staff not found or no linked user account.' })
  setPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SetStaffPasswordDto,
  ) {
    return this.staffService.setPassword(id, dto.newPassword);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a staff member' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 204, description: 'Staff deactivated.' })
  @ApiResponse({ status: 404, description: 'Staff not found.' })
  deactivate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.staffService.deactivate(id);
  }

  @Get(':id/system-role')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the portal login role for a staff member (e.g. teacher vs section_head)' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  getSystemRole(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.staffService.getSystemRole(id);
  }

  @Patch(':id/system-role')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the portal login role for a staff member (e.g. promote a teacher to section head)' })
  @ApiParam({ name: 'id', description: 'Staff UUID' })
  @ApiResponse({ status: 404, description: 'Staff not found or no linked user account.' })
  changeSystemRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ChangeSystemRoleDto,
  ) {
    return this.staffService.changeSystemRole(id, dto.roleId);
  }
}
