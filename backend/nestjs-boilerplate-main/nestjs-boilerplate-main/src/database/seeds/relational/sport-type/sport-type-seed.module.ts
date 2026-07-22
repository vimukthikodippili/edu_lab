import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportTypeSeedService } from './sport-type-seed.service';
import { SportTypeEntity } from '../../../../sports/entities/sport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SportTypeEntity])],
  providers: [SportTypeSeedService],
  exports: [SportTypeSeedService],
})
export class SportTypeSeedModule {}
