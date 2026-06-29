import * as yup from 'yup'

const SL_PHONE = /^(\+94|0)[0-9]{9}$/

export const guardianSchema = yup.object({
  firstName: yup.string().trim().required('First name is required').max(100),
  lastName: yup.string().trim().required('Last name is required').max(100),
  relationship: yup
    .mixed<'father' | 'mother' | 'sibling' | 'uncle' | 'aunt' | 'grandparent' | 'other'>()
    .oneOf(['father', 'mother', 'sibling', 'uncle', 'aunt', 'grandparent', 'other'])
    .required('Relationship is required'),
  nic: yup.string().trim().required('NIC is required').max(12),
  phone: yup
    .string()
    .trim()
    .required('Phone number is required')
    .matches(SL_PHONE, 'Enter a valid Sri Lankan number (e.g. 0771234567)'),
  email: yup.string().trim().email('Enter a valid email').optional(),
  address: yup.string().trim().max(255).optional(),
  isPrimaryContact: yup.boolean().required().default(false),
  idProofFileId: yup.string().uuid('Must be a valid file UUID').optional(),
})

export const step1Schema = yup.object({
  firstName: yup.string().trim().required('First name is required').max(100),
  lastName: yup.string().trim().required('Last name is required').max(100),
  dateOfBirth: yup
    .string()
    .required('Date of birth is required')
    .test('not-future', 'Date of birth cannot be in the future', (val) => {
      if (!val) return false
      return new Date(val) < new Date()
    }),
  gender: yup
    .mixed<'male' | 'female' | 'other'>()
    .oneOf(['male', 'female', 'other'])
    .required('Gender is required'),
  address: yup.string().trim().max(255).optional(),
  contactNumber: yup.string().trim().max(20).optional(),
  nicNumber: yup.string().trim().max(12).optional(),
  medicalNotes: yup.string().trim().max(1000).optional(),
})

export const step2Schema = yup.object({
  gradeId: yup
    .number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .required('Please select a grade')
    .min(1, 'Please select a grade'),
  classSectionId: yup
    .number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .required('Please select a class section')
    .min(1, 'Please select a class section'),
})

export const step3Schema = yup.object({
  guardians: yup
    .array(guardianSchema)
    .min(1, 'At least one guardian must be added before enrollment is complete.')
    .required()
    .test(
      'exactly-one-primary',
      'Exactly one guardian must be marked as the primary contact.',
      (guardians) => {
        if (!guardians || guardians.length === 0) return true // handled by .min(1)
        return guardians.filter((g) => g?.isPrimaryContact === true).length === 1
      },
    ),
})

export const enrollmentSchema = step1Schema.concat(step2Schema).concat(step3Schema)

export type Step1Values = yup.InferType<typeof step1Schema>
export type Step2Values = yup.InferType<typeof step2Schema>
export type Step3Values = yup.InferType<typeof step3Schema>
export type EnrollmentSchemaType = yup.InferType<typeof enrollmentSchema>
