/** Must match backend/services/offerLetterContent.js PAYMENT_TERMS values. */
export const PAYMENT_TERM_OPTIONS = [
  {
    value: 'fifty_fifty',
    label: '50 – 50 milestone split',
    description: '50% after first milestone + attendance; remaining 50% after full program completion.',
  },
  {
    value: 'full_advance',
    label: 'Full payment in advance',
    description: 'Entire professional fee paid before the program starts, after offer acceptance.',
  },
  {
    value: 'monthly',
    label: 'Monthly instalments',
    description: 'Equal monthly payments for sessions delivered each month; final balance after program ends.',
  },
  {
    value: 'full_after_program',
    label: 'Full payment after program',
    description: 'Entire fee paid in one instalment after the complete program is delivered and documented.',
  },
] as const

export type PaymentTermValue = (typeof PAYMENT_TERM_OPTIONS)[number]['value']

export const PAYMENT_TERM_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_TERM_OPTIONS.map((o) => [o.value, o.label])
)

export const DEFAULT_PAYMENT_TERM: PaymentTermValue = 'fifty_fifty'
