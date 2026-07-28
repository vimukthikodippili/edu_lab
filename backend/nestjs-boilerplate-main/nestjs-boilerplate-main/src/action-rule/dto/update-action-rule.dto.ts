import { PartialType } from '@nestjs/swagger';
import { CreateActionRuleDto } from './create-action-rule.dto';

export class UpdateActionRuleDto extends PartialType(CreateActionRuleDto) {}
