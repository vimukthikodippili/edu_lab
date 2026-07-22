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
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { EquipmentService } from './equipment.service';
import { EquipmentInventoryReportService } from './equipment-inventory-report.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { UpdateEquipmentConditionDto } from './dto/update-equipment-condition.dto';
import { WriteOffEquipmentDto } from './dto/write-off-equipment.dto';
import { GetEquipmentReportDto } from './dto/get-equipment-report.dto';
import { ExportEquipmentReportDto } from './dto/export-equipment-report.dto';

/** Write routes use the same broad guard-level role set as LabController.toggleMaintenance
 * (teacher, admin, principal) — the real narrowing is the service's Lab In-Charge ownership
 * check, not the guard. */
const MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'equipment', version: '1' })
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly reportService: EquipmentInventoryReportService,
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
    return roleId !== undefined && MANAGEMENT_ROLES.has(roleId);
  }

  @Get('lab/:labId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A lab's equipment inventory, with a computed lowStock flag per item" })
  async findByLab(@Param('labId', new ParseUUIDPipe({ version: '4' })) labId: string) {
    return this.equipmentService.findByLab(labId);
  }

  @Get(':id/condition-history')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "An equipment item's full condition-change history" })
  async findConditionHistory(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.equipmentService.findConditionHistory(id);
  }

  @Get('report')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full inventory report — scoped to own lab unless privileged' })
  async generateReport(
    @Query() dto: GetEquipmentReportDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.reportService.generateReport(dto, staffId, this.isPrivileged(req));
  }

  @Get('report/export')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @ApiOperation({ summary: 'Export the inventory report as Excel (.xlsx) or PDF' })
  async exportReport(
    @Query() dto: ExportEquipmentReportDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const staffId = await this.resolveStaffId(req.user.id);
      const isPrivileged = this.isPrivileged(req);

      if (dto.format === 'excel') {
        const buffer = await this.reportService.exportExcel(dto, staffId, isPrivileged);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="equipment-inventory.xlsx"');
        res.send(buffer);
      } else {
        const buffer = await this.reportService.exportPdf(dto, staffId, isPrivileged);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="equipment-inventory.pdf"');
        res.send(buffer);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }

  @Post('lab/:labId')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new equipment item — the assigned Lab In-Charge, or Admin/Principal' })
  async create(
    @Param('labId', new ParseUUIDPipe({ version: '4' })) labId: string,
    @Body() dto: CreateEquipmentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.equipmentService.create(labId, dto, staffId, this.isPrivileged(req));
  }

  @Patch(':id')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit an equipment item (not its condition — see the dedicated endpoint)' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEquipmentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.equipmentService.update(id, dto, staffId, this.isPrivileged(req));
  }

  @Patch(':id/condition')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update condition — always retains a history row' })
  async updateCondition(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEquipmentConditionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.equipmentService.updateCondition(id, dto.condition, staffId, this.isPrivileged(req));
  }

  @Post(':id/write-off')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Write off damaged/lost stock — reduces quantity, logs the reason' })
  async writeOff(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: WriteOffEquipmentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.equipmentService.writeOff(id, dto, staffId, this.isPrivileged(req));
  }
}
