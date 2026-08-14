import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';
import { AcademicYearsService } from '../services/academic-years.service';
import { StartAcademicYearDto } from '../dto/start-academic-year.dto';

@ApiTags('Grades — Academic Years')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/academic-years', version: '1' })
export class AcademicYearsController {
  constructor(
    private readonly academicYearsService: AcademicYearsService,
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

  @Get()
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.accountant,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all academic years, newest first' })
  findAll() {
    return this.academicYearsService.findAll();
  }

  @Post('start')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new academic year — clones the latest year\'s class sections and creates its first term' })
  startYear(@Body() dto: StartAcademicYearDto) {
    return this.academicYearsService.startYear(dto);
  }

  @Patch(':id/end')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an academic year as ended — a status marker only, no cascading effects' })
  async endYear(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.academicYearsService.endYear(id, staffId);
  }
}
