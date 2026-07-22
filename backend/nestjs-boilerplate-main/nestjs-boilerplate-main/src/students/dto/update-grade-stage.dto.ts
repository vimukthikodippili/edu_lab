import { PartialType } from '@nestjs/swagger';
import { CreateGradeStageDto } from './create-grade-stage.dto';

export class UpdateGradeStageDto extends PartialType(CreateGradeStageDto) {}
