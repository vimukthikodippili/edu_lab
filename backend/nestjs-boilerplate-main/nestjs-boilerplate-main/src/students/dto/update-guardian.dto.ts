import { PartialType } from '@nestjs/swagger';
import { AddGuardianDto } from './add-guardian.dto';

/** All fields of AddGuardianDto become optional for PATCH updates. */
export class UpdateGuardianDto extends PartialType(AddGuardianDto) {}
