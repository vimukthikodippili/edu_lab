import * as yup from 'yup';
import { CategoryFormValues } from '../types';

export const categorySchema: yup.ObjectSchema<CategoryFormValues> = yup.object({
  name: yup
    .string()
    .required('Category name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  description: yup.string().max(255, 'Description must not exceed 255 characters').optional(),
  color: yup
    .string()
    .required('Please select a color')
    .matches(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #0d6efd)'),
});
