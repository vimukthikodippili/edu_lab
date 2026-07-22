import { PartialType } from '@nestjs/swagger';
import { CreateLabDto } from './create-lab.dto';

// Deliberately excludes isUnderMaintenance — that field is never settable via the generic
// update, only via the dedicated toggleMaintenance endpoint (ToggleLabMaintenanceDto).
export class UpdateLabDto extends PartialType(CreateLabDto) {}
