import * as yup from 'yup';
import { SubjectFormValues } from '../types';

export const subjectSchema: yup.ObjectSchema<SubjectFormValues> = yup.object({
  code: yup
    .string()
    .required('Subject code is required')
    .max(20, 'Code must not exceed 20 characters')
    .matches(
      /^[A-Za-z0-9\-_]+$/,
      'Code can only contain letters, numbers, hyphens, or underscores',
    )
    .trim(),
  name: yup
    .string()
    .required('Subject name is required')
    .max(150, 'Name must not exceed 150 characters')
    .trim(),
  description: yup.string().max(500, 'Description must not exceed 500 characters').optional(),
  categoryId: yup
    .number()
    .required('Please select a category')
    .positive('Please select a valid category')
    .integer(),
});
