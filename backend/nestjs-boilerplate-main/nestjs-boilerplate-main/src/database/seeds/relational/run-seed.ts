import { NestFactory } from '@nestjs/core';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { GradeSeedService } from './grade/grade-seed.service';
import { GradeStageSeedService } from './grade-stage/grade-stage-seed.service';
import { ClassSectionSeedService } from './class-section/class-section-seed.service';
import { SportTypeSeedService } from './sport-type/sport-type-seed.service';
import { SportMetricSeedService } from './sport-metric/sport-metric-seed.service';
import { LabTypeSeedService } from './lab-type/lab-type-seed.service';
import { EquipmentCategorySeedService } from './equipment-category/equipment-category-seed.service';
import { StudentSeedService } from './student/student-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // Order matters: roles and statuses first, then users, then grades before sections,
  // then sport types before sport metrics (metrics resolve their sportTypeId by name lookup).
  // Students depend on class sections existing, so they run last.
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(GradeSeedService).run();
  await app.get(GradeStageSeedService).run();
  await app.get(ClassSectionSeedService).run();
  await app.get(SportTypeSeedService).run();
  await app.get(SportMetricSeedService).run();
  await app.get(LabTypeSeedService).run();
  await app.get(EquipmentCategorySeedService).run();
  // 10 students + 1 guardian each across all 39 class sections (13 grades × 3 sections).
  await app.get(StudentSeedService).run();

  await app.close();
};

void runSeed();
