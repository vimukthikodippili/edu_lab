import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisorderRegistrySeedService } from './disorder-registry-seed.service';
import { DisorderRegistryEntity } from '../../../../disorder-registry/entities/disorder-registry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DisorderRegistryEntity])],
  providers: [DisorderRegistrySeedService],
  exports: [DisorderRegistrySeedService],
})
export class DisorderRegistrySeedModule {}
