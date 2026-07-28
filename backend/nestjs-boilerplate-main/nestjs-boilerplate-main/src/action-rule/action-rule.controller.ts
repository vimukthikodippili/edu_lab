import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { ActionRuleService } from './action-rule.service';
import { CreateActionRuleDto } from './dto/create-action-rule.dto';
import { UpdateActionRuleDto } from './dto/update-action-rule.dto';

/** MHA-131 — FR-MHA-37. Admin-only for both read and write — narrower than disorder-registry's
 * broad read access, because the action rule set is a backend-generation input never shown to a
 * counselor/principal during a session, unlike domain definitions which drive the intake form. */
@ApiTags('MHA — Action Rules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'action-rules', version: '1' })
export class ActionRuleController {
  constructor(private readonly actionRuleService: ActionRuleService) {}

  @Get()
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List recommended-action rules, optionally active-only' })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.actionRuleService.findAll(activeOnly === 'true');
  }

  @Post()
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new recommended-action rule' })
  async create(@Body() dto: CreateActionRuleDto) {
    return this.actionRuleService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a rule, or deactivate/reactivate it via isActive' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateActionRuleDto,
  ) {
    return this.actionRuleService.update(id, dto);
  }
}
