'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export interface CrmClientInput {
  name: string
  apiUrl: string
  apiKey?: string | null
  apiSecret?: string | null
  httpMethod?: string
  headers?: Record<string, string> | null
  fieldMapping?: Record<string, string>
  enabled?: boolean
  priority?: number
}

export interface CrmQuotaInput {
  leadLimit: number
  periodDays: number
}

export async function getCrmClients() {
  await requireAuth()
  
  return prisma.crmClient.findMany({
    include: {
      quotas: true,
      _count: {
        select: {
          deliveries: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCrmClient(id: string) {
  await requireAuth()
  
  return prisma.crmClient.findUnique({
    where: { id },
    include: {
      quotas: true,
      deliveries: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          form: { select: { name: true, slug: true } },
        },
      },
    },
  })
}

export async function createCrmClient(data: CrmClientInput, quotas: CrmQuotaInput[]) {
  await requireAuth()
  
  const client = await prisma.crmClient.create({
    data: {
      name: data.name,
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      httpMethod: data.httpMethod || 'POST',
      headers: data.headers ? JSON.parse(JSON.stringify(data.headers)) : undefined,
      fieldMapping: data.fieldMapping ? JSON.parse(JSON.stringify(data.fieldMapping)) : {},
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
      quotas: {
        create: quotas.map(q => ({
          leadLimit: q.leadLimit,
          periodDays: q.periodDays,
        })),
      },
    },
    include: { quotas: true },
  })

  revalidatePath('/admin/distribution')
  return client
}

export async function updateCrmClient(
  id: string,
  data: Partial<CrmClientInput>,
  quotas?: CrmQuotaInput[]
) {
  await requireAuth()
  
  // Update client
  const client = await prisma.crmClient.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.apiUrl !== undefined && { apiUrl: data.apiUrl }),
      ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
      ...(data.apiSecret !== undefined && { apiSecret: data.apiSecret }),
      ...(data.httpMethod !== undefined && { httpMethod: data.httpMethod }),
      ...(data.headers !== undefined && { headers: data.headers ? JSON.parse(JSON.stringify(data.headers)) : undefined }),
      ...(data.fieldMapping !== undefined && { fieldMapping: data.fieldMapping ? JSON.parse(JSON.stringify(data.fieldMapping)) : {} }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
  })

  // Update quotas if provided
  if (quotas !== undefined) {
    // Delete existing quotas
    await prisma.crmQuota.deleteMany({ where: { clientId: id } })
    
    // Create new quotas
    await prisma.crmQuota.createMany({
      data: quotas.map(q => ({
        clientId: id,
        leadLimit: q.leadLimit,
        periodDays: q.periodDays,
      })),
    })
  }

  revalidatePath('/admin/distribution')
  return client
}

export async function deleteCrmClient(id: string) {
  await requireAuth()
  
  await prisma.crmClient.delete({ where: { id } })
  
  revalidatePath('/admin/distribution')
}

export async function toggleCrmClient(id: string, enabled: boolean) {
  await requireAuth()
  
  await prisma.crmClient.update({
    where: { id },
    data: { enabled },
  })
  
  revalidatePath('/admin/distribution')
}

export async function getCrmDeliveries(options?: {
  clientId?: string
  formId?: string
  success?: boolean
  limit?: number
}) {
  await requireAuth()
  
  return prisma.crmDelivery.findMany({
    where: {
      ...(options?.clientId && { clientId: options.clientId }),
      ...(options?.formId && { formId: options.formId }),
      ...(options?.success !== undefined && { success: options.success }),
    },
    include: {
      client: { select: { name: true } },
      form: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  })
}

export async function getClientQuotaUsage(clientId: string) {
  await requireAuth()
  
  const client = await prisma.crmClient.findUnique({
    where: { id: clientId },
    include: { quotas: true },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const quotaUsage = await Promise.all(
    client.quotas.map(async (quota) => {
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - quota.periodDays)

      const count = await prisma.crmDelivery.count({
        where: {
          clientId,
          success: true,
          createdAt: { gte: periodStart },
        },
      })

      return {
        quotaId: quota.id,
        leadLimit: quota.leadLimit,
        periodDays: quota.periodDays,
        currentCount: count,
        remaining: quota.leadLimit - count,
        percentUsed: Math.round((count / quota.leadLimit) * 100),
      }
    })
  )

  return quotaUsage
}

