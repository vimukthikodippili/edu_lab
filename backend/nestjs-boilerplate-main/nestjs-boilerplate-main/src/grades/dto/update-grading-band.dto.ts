import { PartialType } from '@nestjs/swagger';
import { CreateGradingBandDto } from './create-grading-band.dto';

export class UpdateGradingBandDto extends PartialType(CreateGradingBandDto) {}
