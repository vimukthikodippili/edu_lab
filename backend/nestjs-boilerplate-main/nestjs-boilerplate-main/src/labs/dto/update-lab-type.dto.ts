import { PartialType } from '@nestjs/swagger';
import { CreateLabTypeDto } from './create-lab-type.dto';

export class UpdateLabTypeDto extends PartialType(CreateLabTypeDto) {}
