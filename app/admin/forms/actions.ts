'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { FormSchema, QuestionSchema, FormSnapshotSchema, type FormSnapshot } from '@/lib/validations'
import { z } from 'zod'

export async function createForm(data: z.input<typeof FormSchema>) {
  await requireAuth()
  
  const validated = FormSchema.parse(data)
  
  // Check if slug is unique
  const existing = await prisma.form.findUnique({
    where: { slug: validated.slug },
  })
  
  if (existing) {
    throw new Error('A form with this slug already exists')
  }
  
  const form = await prisma.form.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      status: validated.status,
      introTitle: validated.introTitle || 'Welcome',
      introDescription: validated.introDescription || 'Please fill out this form',
      thankYouTitle: validated.thankYouTitle || 'Thank you!',
      thankYouMessage: validated.thankYouMessage || 'Your response has been recorded.',
      redirectUrl: validated.redirectUrl || null,
      redirectDelaySec: validated.redirectDelaySec ?? 5,
      webhookUrl: validated.webhookUrl || null,
      webhookEnabled: validated.webhookEnabled ?? false,
      webhookSecret: validated.webhookSecret || null,
    },
  })
  
  revalidatePath('/admin/forms')
  return form
}

export async function updateForm(id: string, data: Partial<z.infer<typeof FormSchema>>) {
  await requireAuth()
  
  const form = await prisma.form.findUnique({ where: { id } })
  if (!form) {
    throw new Error('Form not found')
  }
  
  // If slug is being changed, check uniqueness
  if (data.slug && data.slug !== form.slug) {
    const existing = await prisma.form.findUnique({
      where: { slug: data.slug },
    })
    if (existing) {
      throw new Error('A form with this slug already exists')
    }
  }
  
  const updated = await prisma.form.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      status: data.status,
      introTitle: data.introTitle,
      introDescription: data.introDescription,
      thankYouTitle: data.thankYouTitle,
      thankYouMessage: data.thankYouMessage,
      redirectUrl: data.redirectUrl || null,
      redirectDelaySec: data.redirectDelaySec,
      webhookUrl: data.webhookUrl || null,
      webhookEnabled: data.webhookEnabled,
      webhookSecret: data.webhookSecret,
    },
  })
  
  revalidatePath('/admin/forms')
  revalidatePath(`/admin/forms/${id}`)
  return updated
}

export async function deleteForm(id: string) {
  await requireAuth()
  
  await prisma.form.delete({ where: { id } })
  
  revalidatePath('/admin/forms')
}

export async function createQuestion(formId: string, data: z.infer<typeof QuestionSchema>) {
  await requireAuth()
  
  const validated = QuestionSchema.parse(data)
  
  // Check if key is unique within the form
  const existing = await prisma.question.findFirst({
    where: { formId, key: validated.key },
  })
  
  if (existing) {
    throw new Error('A question with this key already exists in this form')
  }
  
  const question = await prisma.question.create({
    data: {
      formId,
      key: validated.key,
      type: validated.type,
      label: validated.label,
      required: validated.required,
      order: validated.order,
      configJson: validated.configJson ? JSON.parse(JSON.stringify(validated.configJson)) : undefined,
    },
  })
  
  revalidatePath(`/admin/forms/${formId}`)
  return question
}

export async function updateQuestion(id: string, formId: string, data: Partial<z.infer<typeof QuestionSchema>>) {
  await requireAuth()
  
  const question = await prisma.question.findUnique({ where: { id } })
  if (!question) {
    throw new Error('Question not found')
  }
  
  // If key is being changed, check uniqueness
  if (data.key && data.key !== question.key) {
    const existing = await prisma.question.findFirst({
      where: { formId, key: data.key, id: { not: id } },
    })
    if (existing) {
      throw new Error('A question with this key already exists in this form')
    }
  }
  
  const updated = await prisma.question.update({
    where: { id },
    data: {
      key: data.key,
      type: data.type,
      label: data.label,
      required: data.required,
      order: data.order,
      configJson: data.configJson ? JSON.parse(JSON.stringify(data.configJson)) : undefined,
    },
  })
  
  revalidatePath(`/admin/forms/${formId}`)
  return updated
}

export async function deleteQuestion(id: string, formId: string) {
  await requireAuth()
  
  await prisma.question.delete({ where: { id } })
  
  revalidatePath(`/admin/forms/${formId}`)
}

export async function reorderQuestions(formId: string, questionIds: string[]) {
  await requireAuth()
  
  // Update order for each question
  await Promise.all(
    questionIds.map((id, index) =>
      prisma.question.update({
        where: { id },
        data: { order: index },
      })
    )
  )
  
  revalidatePath(`/admin/forms/${formId}`)
}

export async function publishForm(formId: string) {
  await requireAuth()
  
  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })
  
  if (!form) {
    throw new Error('Form not found')
  }
  
  if (form.questions.length === 0) {
    throw new Error('Cannot publish a form without questions')
  }
  
  // Get the latest version number
  const latestVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { versionNumber: 'desc' },
  })
  
  const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1
  
  // Create snapshot
  const snapshot = {
    id: form.id,
    name: form.name,
    slug: form.slug,
    introTitle: form.introTitle,
    introDescription: form.introDescription,
    thankYouTitle: form.thankYouTitle,
    thankYouMessage: form.thankYouMessage,
    redirectUrl: form.redirectUrl,
    redirectDelaySec: form.redirectDelaySec,
    questions: form.questions.map(q => ({
      key: q.key,
      type: q.type,
      label: q.label,
      required: q.required,
      order: q.order,
      configJson: q.configJson,
    })),
  }
  
  // Validate snapshot
  FormSnapshotSchema.parse(snapshot)
  
  // Create new version
  const version = await prisma.formVersion.create({
    data: {
      formId,
      versionNumber: newVersionNumber,
      snapshotJson: JSON.parse(JSON.stringify(snapshot)),
    },
  })
  
  // Update form status and published version
  await prisma.form.update({
    where: { id: formId },
    data: {
      status: 'published',
      publishedVersionId: version.id,
    },
  })
  
  revalidatePath(`/admin/forms/${formId}`)
  revalidatePath('/admin/forms')
  
  return version
}

export async function unpublishForm(formId: string) {
  await requireAuth()
  
  await prisma.form.update({
    where: { id: formId },
    data: {
      status: 'draft',
    },
  })
  
  revalidatePath(`/admin/forms/${formId}`)
  revalidatePath('/admin/forms')
}

// Distribution settings

export async function updateFormDistribution(
  formId: string,
  enabled: boolean,
  clientConfigs: { clientId: string; enabled: boolean; priority: number | null }[]
) {
  await requireAuth()
  
  // Update form distribution enabled flag
  await prisma.form.update({
    where: { id: formId },
    data: { distributionEnabled: enabled },
  })
  
  // Delete existing client associations
  await prisma.formDistributionClient.deleteMany({
    where: { formId },
  })
  
  // Create new client associations
  if (clientConfigs.length > 0) {
    await prisma.formDistributionClient.createMany({
      data: clientConfigs.map((config) => ({
        formId,
        clientId: config.clientId,
        enabled: config.enabled,
        priority: config.priority,
      })),
    })
  }
  
  revalidatePath(`/admin/forms/${formId}/settings`)
}

