import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffEntity } from './entities/staff.entity';
import { StaffRoleAssignmentEntity } from './entities/staff-role-assignment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffEntity, StaffRoleAssignmentEntity, FileEntity]),
    UsersModule,
  ],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
