import { PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

/** All CreateStaffDto fields become optional for PATCH updates. */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
