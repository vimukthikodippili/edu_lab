import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { TopicWeaknessConfig } from './topic-weakness-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(2)
  @Max(20)
  @IsOptional()
  TOPIC_WEAKNESS_WINDOW_SIZE: number;
}

export default registerAs<TopicWeaknessConfig>('topicWeakness', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    windowSize: process.env.TOPIC_WEAKNESS_WINDOW_SIZE
      ? parseInt(process.env.TOPIC_WEAKNESS_WINDOW_SIZE, 10)
      : 3,
  };
});
