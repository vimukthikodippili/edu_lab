import { IsNumber, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export class CreateFeeWaiverRequestDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  requestedDiscountAmount: number;

  @IsString()
  @MaxLength(500)
  reason: string;
}
