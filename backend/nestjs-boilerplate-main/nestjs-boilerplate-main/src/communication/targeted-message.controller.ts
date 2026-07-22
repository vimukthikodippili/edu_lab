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
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { TargetedMessageService } from './targeted-message.service';
import { RecipientCriteriaDto } from './dto/recipient-criteria.dto';
import { SendTargetedMessageDto } from './dto/send-targeted-message.dto';

/** Every section of this story's own prompt says "Principal," consistently — unlike every other
 * story in this session which explicitly says "Admin/Principal" — so all routes here are
 * @Roles(principal) only, a deliberate, disclosed narrower reading. */
@ApiTags('Communication — Targeted Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.principal)
@Controller({ path: 'targeted-messages', version: '1' })
export class TargetedMessageController {
  constructor(
    private readonly targetedMessageService: TargetedMessageService,
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

  @Post('preview-recipients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve the live recipient count for a set of targeting criteria, no side effects' })
  previewRecipients(@Body() dto: RecipientCriteriaDto) {
    return this.targetedMessageService.previewRecipients(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Compose and send a targeted message to the resolved parents/teachers' })
  async send(@Body() dto: SendTargetedMessageDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.targetedMessageService.send(dto, staffId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all targeted messages this Principal has sent, most recent first' })
  getHistory() {
    return this.targetedMessageService.getHistory();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full recipient list + per-recipient delivery status for one targeted message' })
  getMessageDetail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.targetedMessageService.getMessageDetail(id);
  }
}
