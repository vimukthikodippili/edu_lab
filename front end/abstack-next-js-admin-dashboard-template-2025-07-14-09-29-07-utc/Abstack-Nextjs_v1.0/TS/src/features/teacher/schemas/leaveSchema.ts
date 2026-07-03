import * as yup from 'yup'

export const leaveSchema = yup.object({
  leaveType: yup
    .mixed<'annual' | 'medical' | 'casual' | 'no_pay'>()
    .oneOf(['annual', 'medical', 'casual', 'no_pay'], 'Please select a valid leave type')
    .required('Leave type is required'),
  startDate: yup.string().required('Start date is required'),
  endDate: yup
    .string()
    .required('End date is required')
    .test(
      'after-start',
      'End date must be on or after start date',
      function (val) {
        return !val || !this.parent.startDate || val >= this.parent.startDate
      },
    ),
  reason: yup
    .string()
    .trim()
    .min(10, 'Please provide at least 10 characters')
    .required('Reason is required'),
})

export type LeaveFormValues = yup.InferType<typeof leaveSchema>
