import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { MarkCorrectionService } from '../services/mark-correction.service';
import { CreateMarkCorrectionRequestDto } from '../dto/create-mark-correction-request.dto';
import { DecideMarkCorrectionRequestDto } from '../dto/decide-mark-correction-request.dto';
import { MarkCorrectionStatus } from '../entities/mark-correction-request.entity';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

@ApiTags('Grades — Mark Corrections')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/marks', version: '1' })
export class MarkCorrectionController {
  constructor(
    private readonly markCorrectionService: MarkCorrectionService,
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

  @Post(':markId/correction-requests')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a correction to a mark, with a required reason' })
  async create(
    @Param('markId', ParseUUIDPipe) markId: string,
    @Body() dto: CreateMarkCorrectionRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.markCorrectionService.create(markId, staffId, dto);
  }

  @Get('correction-requests/mine')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The caller's own mark correction requests" })
  async findMine(@Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.markCorrectionService.findMine(staffId);
  }

  @Post('correction-requests/:id/approve')
  @Roles(RoleEnum.principal, RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideMarkCorrectionRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.markCorrectionService.decide(
      id,
      MarkCorrectionStatus.APPROVED,
      staffId,
      dto.decisionNote,
    );
  }

  @Post('correction-requests/:id/reject')
  @Roles(RoleEnum.principal, RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideMarkCorrectionRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.markCorrectionService.decide(
      id,
      MarkCorrectionStatus.REJECTED,
      staffId,
      dto.decisionNote,
    );
  }
}
