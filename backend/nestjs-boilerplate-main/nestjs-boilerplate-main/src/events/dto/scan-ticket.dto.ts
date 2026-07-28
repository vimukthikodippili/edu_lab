import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ScanTicketDto {
  @ApiProperty({ description: 'The raw code decoded from the scanned QR image (a ticket or participant uuid)' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
