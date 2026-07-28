import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionRuleEntity } from './entities/action-rule.entity';
import { ActionRuleController } from './action-rule.controller';
import { ActionRuleService } from './action-rule.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActionRuleEntity])],
  controllers: [ActionRuleController],
  providers: [ActionRuleService],
  exports: [ActionRuleService],
})
export class ActionRuleModule {}
