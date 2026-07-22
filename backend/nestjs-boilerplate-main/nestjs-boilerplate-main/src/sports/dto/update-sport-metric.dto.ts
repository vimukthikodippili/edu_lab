import { PartialType } from '@nestjs/swagger';
import { CreateSportMetricDto } from './create-sport-metric.dto';

export class UpdateSportMetricDto extends PartialType(CreateSportMetricDto) {}
