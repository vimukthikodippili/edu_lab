import { NestFactory } from '@nestjs/core';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { GradeSeedService } from './grade/grade-seed.service';
import { ClassSectionSeedService } from './class-section/class-section-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // Order matters: roles and statuses first, then users, then grades before sections
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(GradeSeedService).run();
  await app.get(ClassSectionSeedService).run();

  await app.close();
};

void runSeed();
