import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MhaConsentEntity } from './entities/mha-consent.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { MhaConsentService } from './mha-consent.service';
import { MhaConsentController } from './mha-consent.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MhaConsentEntity, StudentEntity, StudentGuardianEntity]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [MhaConsentService],
  controllers: [MhaConsentController],
  exports: [MhaConsentService],
})
export class MhaConsentModule {}
