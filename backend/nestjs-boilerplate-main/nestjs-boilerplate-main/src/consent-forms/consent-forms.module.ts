import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentFormEntity } from './entities/consent-form.entity';
import { ConsentResponseEntity } from './entities/consent-response.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { ConsentFormService } from './consent-form.service';
import { ConsentResponseService } from './consent-response.service';
import { ConsentFormController } from './consent-form.controller';
import { ConsentResponseController } from './consent-response.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentFormEntity,
      ConsentResponseEntity,
      StudentEntity,
      StudentGuardianEntity,
      GuardianEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [ConsentFormService, ConsentResponseService],
  controllers: [ConsentResponseController, ConsentFormController],
})
export class ConsentFormsModule {}
