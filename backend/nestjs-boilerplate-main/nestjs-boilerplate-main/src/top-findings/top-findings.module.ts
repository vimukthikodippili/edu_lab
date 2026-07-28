import { Module } from '@nestjs/common';
import { TopFindingsService } from './top-findings.service';

@Module({
  providers: [TopFindingsService],
  exports: [TopFindingsService],
})
export class TopFindingsModule {}
