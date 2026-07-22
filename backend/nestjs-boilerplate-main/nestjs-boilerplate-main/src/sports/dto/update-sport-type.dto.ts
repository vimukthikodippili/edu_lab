import { PartialType } from '@nestjs/swagger';
import { CreateSportTypeDto } from './create-sport-type.dto';

export class UpdateSportTypeDto extends PartialType(CreateSportTypeDto) {}
