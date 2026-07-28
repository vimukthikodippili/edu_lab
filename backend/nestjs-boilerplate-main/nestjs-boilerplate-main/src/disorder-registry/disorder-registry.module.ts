import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisorderRegistryEntity } from './entities/disorder-registry.entity';
import { DisorderRegistryController } from './disorder-registry.controller';
import { DisorderRegistryService } from './disorder-registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([DisorderRegistryEntity])],
  controllers: [DisorderRegistryController],
  providers: [DisorderRegistryService],
  exports: [DisorderRegistryService],
})
export class DisorderRegistryModule {}
