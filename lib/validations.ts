import { z } from 'zod'

// Question types enum
export const QuestionTypeEnum = z.enum([
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'email',
  'phone',
  'consent',
])

export type QuestionType = z.infer<typeof QuestionTypeEnum>

// Form status enum
export const FormStatusEnum = z.enum(['draft', 'published'])

export type FormStatus = z.infer<typeof FormStatusEnum>

// Question config schema
export const QuestionConfigSchema = z.object({
  placeholder: z.string().optional(),
  choices: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })).optional(),
  consentText: z.string().optional(),
}).passthrough()

export type QuestionConfig = z.infer<typeof QuestionConfigSchema>

// Question schema
export const QuestionSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, 'Key is required').max(30),
  type: QuestionTypeEnum,
  label: z.string().min(1, 'Label is required'),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  configJson: QuestionConfigSchema.optional().nullable(),
})

export type QuestionInput = z.infer<typeof QuestionSchema>

// Form schema for creation/update
export const FormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  status: FormStatusEnum.default('draft'),
  introTitle: z.string().optional().nullable(),
  introDescription: z.string().optional().nullable(),
  thankYouTitle: z.string().optional().nullable(),
  thankYouMessage: z.string().optional().nullable(),
  redirectUrl: z.string().url().optional().nullable().or(z.literal('')),
  redirectDelaySec: z.number().int().min(0).max(60).optional().nullable(),
  webhookUrl: z.string().url().optional().nullable().or(z.literal('')),
  webhookEnabled: z.boolean().optional().default(false),
  webhookSecret: z.string().optional().nullable(),
})

export type FormInput = z.infer<typeof FormSchema>

// Answer value schema
export const AnswerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.null(),
])

export type AnswerValue = z.infer<typeof AnswerValueSchema>

// Submission answer schema
export const SubmissionAnswerSchema = z.object({
  questionKey: z.string(),
  value: AnswerValueSchema,
})

// Public submission schema
export const PublicSubmissionSchema = z.object({
  formSlug: z.string().min(1),
  answers: z.record(z.string(), AnswerValueSchema),
  meta: z.object({
    referrer: z.string().optional().nullable(),
    utmSource: z.string().optional().nullable(),
    utmMedium: z.string().optional().nullable(),
    utmCampaign: z.string().optional().nullable(),
    utmTerm: z.string().optional().nullable(),
    utmContent: z.string().optional().nullable(),
  }).optional(),
})

export type PublicSubmissionInput = z.infer<typeof PublicSubmissionSchema>

// Form snapshot schema (stored in FormVersion)
export const FormSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  introTitle: z.string().nullable(),
  introDescription: z.string().nullable(),
  thankYouTitle: z.string().nullable(),
  thankYouMessage: z.string().nullable(),
  redirectUrl: z.string().nullable(),
  redirectDelaySec: z.number().nullable(),
  questions: z.array(z.object({
    key: z.string(),
    type: QuestionTypeEnum,
    label: z.string(),
    required: z.boolean(),
    order: z.number(),
    configJson: QuestionConfigSchema.nullable(),
  })),
})

export type FormSnapshot = z.infer<typeof FormSnapshotSchema>

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Basic phone validation: at least 7 digits, may contain +, -, (), spaces
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  const phoneRegex = /^\+?[0-9]{7,15}$/
  return phoneRegex.test(cleaned)
}

export function validateAnswer(
  type: QuestionType,
  value: AnswerValue,
  required: boolean,
  config?: QuestionConfig | null
): { valid: boolean; error?: string } {
  // Check required
  if (required) {
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: 'This field is required' }
    }
    if (Array.isArray(value) && value.length === 0) {
      return { valid: false, error: 'Please select at least one option' }
    }
  }

  // If not required and empty, it's valid
  if (value === null || value === undefined || value === '') {
    return { valid: true }
  }

  // Type-specific validation
  switch (type) {
    case 'email':
      if (typeof value === 'string' && !validateEmail(value)) {
        return { valid: false, error: 'Please enter a valid email address' }
      }
      break

    case 'phone':
      if (typeof value === 'string' && !validatePhone(value)) {
        return { valid: false, error: 'Please enter a valid phone number' }
      }
      break

    case 'single_choice':
      if (config?.choices && typeof value === 'string') {
        const validChoice = config.choices.some(c => c.id === value)
        if (!validChoice) {
          return { valid: false, error: 'Please select a valid option' }
        }
      }
      break

    case 'multiple_choice':
      if (config?.choices && Array.isArray(value)) {
        const validChoices = value.every(v => 
          config.choices?.some(c => c.id === v)
        )
        if (!validChoices) {
          return { valid: false, error: 'Please select valid options' }
        }
      }
      break

    case 'consent':
      if (required && value !== true) {
        return { valid: false, error: 'You must agree to continue' }
      }
      break
  }

  return { valid: true }
}

