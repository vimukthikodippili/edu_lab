import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { ClassDiaryService } from './class-diary.service';
import { UpsertClassDiaryEntryDto } from './dto/upsert-class-diary-entry.dto';
import { QueryClassDiaryDto } from './dto/query-class-diary.dto';

@ApiTags('Class Diary')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'class-diary', version: '1' })
export class ClassDiaryController {
  constructor(
    private readonly classDiaryService: ClassDiaryService,
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

  @Get('daily')
  @Roles(RoleEnum.admin, RoleEnum.teacher)
  async getDailyView(
    @Query() query: QueryClassDiaryDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.classDiaryService.getDailyView(staffId, query.date);
  }

  @Put('entry')
  @Roles(RoleEnum.admin, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  async upsertEntry(
    @Body() dto: UpsertClassDiaryEntryDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.classDiaryService.upsertEntry(staffId, dto);
  }
}
