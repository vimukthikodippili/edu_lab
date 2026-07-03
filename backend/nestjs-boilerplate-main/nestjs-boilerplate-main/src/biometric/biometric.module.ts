import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentRecordEntity } from './entities/consent-record.entity';
import { BiometricVaultEntity } from './entities/biometric-vault.entity';
import { BiometricReleaseLogEntity } from './entities/biometric-release-log.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BiometricCryptoService } from './biometric-crypto.service';
import { BiometricService } from './biometric.service';
import { BiometricController } from './biometric.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentRecordEntity,
      BiometricVaultEntity,
      BiometricReleaseLogEntity,
      GuardianEntity,
      StudentGuardianEntity,
      TimetableEntryEntity,
      UserEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [BiometricService, BiometricCryptoService],
  controllers: [BiometricController],
  exports: [BiometricService],
})
export class BiometricModule {}
