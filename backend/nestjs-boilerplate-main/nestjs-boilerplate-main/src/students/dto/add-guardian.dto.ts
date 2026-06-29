import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { CreateGuardianDto } from './create-guardian.dto';

/**
 * DTO for adding a guardian to an already-enrolled student.
 * `isPrimaryContact` is required here (unlike the enrollment flow where it's optional).
 */
export class AddGuardianDto extends CreateGuardianDto {
  @ApiProperty({
    example: false,
    description:
      'Mark this guardian as the primary contact. Setting true clears the existing primary. '
      + 'Exactly one guardian per student must be primary at all times.',
  })
  @IsNotEmpty()
  @IsBoolean()
  override isPrimaryContact: boolean;

  @ApiPropertyOptional({
    example: 'uuid-of-uploaded-id-scan',
    description: 'UUID of a previously-uploaded file (NIC scan, birth certificate, etc.).',
  })
  @IsOptional()
  @IsUUID('4', { message: 'idProofFileId must be a valid UUID' })
  override idProofFileId?: string;
}
