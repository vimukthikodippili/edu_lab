export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
}

/** MHA-122 (AC #3). Placeholder crisis-resource contacts shown to the counselor immediately
 * after a safety flag is raised. These are NOT real numbers — every entry must be replaced by
 * the school admin with actual local/national contacts before this feature goes live. Do not
 * remove the '[CONFIGURE]' markers as a way to "clean this up"; their presence is what makes an
 * unconfigured deployment obvious in a screenshot or QA pass. */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: '[CONFIGURE: National/Regional Crisis Helpline]',
    phone: '000-0000',
    description: "Replace with your country's 24/7 crisis or suicide-prevention hotline.",
  },
  {
    name: '[CONFIGURE: School Emergency Line]',
    phone: '000-0000',
    description: "Replace with the school's designated after-hours emergency contact number.",
  },
  {
    name: '[CONFIGURE: Local Emergency Services]',
    phone: '000',
    description:
      'Replace with the local police/ambulance emergency dispatch number if different from national default.',
  },
];
