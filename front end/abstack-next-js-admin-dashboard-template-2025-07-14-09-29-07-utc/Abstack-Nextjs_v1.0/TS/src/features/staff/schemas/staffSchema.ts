import * as yup from 'yup'
import { STAFF_FUNCTIONAL_ROLES } from '../types'

const roleValues = STAFF_FUNCTIONAL_ROLES.map((r) => r.value)

export const staffSchema = yup.object({
  firstName: yup.string().trim().required('First name is required').max(100),
  lastName: yup.string().trim().required('Last name is required').max(100),
  designation: yup.string().trim().required('Designation is required').max(150),
  department: yup.string().trim().required('Department is required').max(100),
  startDate: yup
    .string()
    .required('Start date is required')
    .test('not-future', 'Start date cannot be in the future', (v) => {
      if (!v) return false
      return new Date(v) <= new Date()
    }),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(
      /^(\+94|0)[0-9]{9}$/,
      'Enter a valid Sri Lankan number (e.g. 0771234567 or +94771234567)',
    ),
  nicNumber: yup.string().trim().required('NIC is required').max(12),
  address: yup.string().trim().optional(),
  qualifications: yup.array().of(yup.string().trim().required()).default([]),
  roles: yup
    .array()
    .of(yup.string().oneOf(roleValues, 'Invalid role').required())
    .min(1, 'At least one role must be assigned')
    .required('Roles are required'),
  photoId: yup.string().optional(),
  qualificationDocIds: yup.array().of(yup.string().uuid('Invalid file ID').required()).default([]),
  systemRoleId: yup.mixed<4 | 5>().oneOf([4, 5]).optional(),
  initialPassword: yup
    .string()
    .trim()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
})

export type StaffSchemaType = yup.InferType<typeof staffSchema>
