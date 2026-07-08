import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { LessonPlanConfig } from './lesson-plan-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  LESSON_PLAN_REMINDER_DAYS: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  LESSON_PLAN_DEADLINE_MONTH: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  LESSON_PLAN_DEADLINE_DAY: number;
}

export default registerAs<LessonPlanConfig>('lessonPlan', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    reminderDaysBeforeDeadline: process.env.LESSON_PLAN_REMINDER_DAYS
      ? parseInt(process.env.LESSON_PLAN_REMINDER_DAYS, 10)
      : 7,
    planningDeadlineMonth: process.env.LESSON_PLAN_DEADLINE_MONTH
      ? parseInt(process.env.LESSON_PLAN_DEADLINE_MONTH, 10)
      : 3,
    planningDeadlineDay: process.env.LESSON_PLAN_DEADLINE_DAY
      ? parseInt(process.env.LESSON_PLAN_DEADLINE_DAY, 10)
      : 31,
  };
});
