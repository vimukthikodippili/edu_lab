import { PartialType } from '@nestjs/swagger';
import { CreateSubjectCategoryDto } from './create-subject-category.dto';

export class UpdateSubjectCategoryDto extends PartialType(CreateSubjectCategoryDto) {}
