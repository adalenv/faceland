import { prisma } from './db'
import { CrmClient, CrmQuota, FormDistributionClient } from '@prisma/client'

export interface FieldMapping {
  [formField: string]: string // formField -> crmField
}

export interface EligibleClient {
  client: CrmClient & { quotas: CrmQuota[] }
  formClient: FormDistributionClient | null
  effectivePriority: number
  quotaStatus: QuotaStatus[]
}

export interface QuotaStatus {
  quotaId: string
  leadLimit: number
  periodDays: number
  currentCount: number
  remaining: number
  isAvailable: boolean
}

export interface DistributionResult {
  success: boolean
  clientId?: string
  clientName?: string
  deliveryId?: string
  error?: string
  responseStatus?: number
}

/**
 * Get all clients eligible to receive leads for a specific form
 */
export async function getEligibleClients(formId: string): Promise<EligibleClient[]> {
  // Get all enabled CRM clients with their quotas
  const clients = await prisma.crmClient.findMany({
    where: { enabled: true },
    include: { quotas: true },
  })

  // Get form-specific client configurations
  const formClients = await prisma.formDistributionClient.findMany({
    where: { formId, enabled: true },
  })

  const formClientMap = new Map(formClients.map(fc => [fc.clientId, fc]))

  const eligibleClients: EligibleClient[] = []

  for (const client of clients) {
    const formClient = formClientMap.get(client.id) || null
    
    // If form has specific clients configured, only include those
    if (formClients.length > 0 && !formClient) {
      continue
    }

    // Check quota status for this client
    const quotaStatus = await checkClientQuotas(client.id, client.quotas)
    
    // Client is eligible if all quotas have remaining capacity
    const allQuotasAvailable = quotaStatus.every(qs => qs.isAvailable)
    
    if (allQuotasAvailable) {
      eligibleClients.push({
        client,
        formClient,
        effectivePriority: formClient?.priority ?? client.priority,
        quotaStatus,
      })
    }
  }

  // Sort by priority (highest first)
  eligibleClients.sort((a, b) => b.effectivePriority - a.effectivePriority)

  return eligibleClients
}

/**
 * Check quota status for a specific client
 */
export async function checkClientQuotas(
  clientId: string,
  quotas: CrmQuota[]
): Promise<QuotaStatus[]> {
  const statuses: QuotaStatus[] = []

  for (const quota of quotas) {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - quota.periodDays)

    // Count successful deliveries in the period
    const currentCount = await prisma.crmDelivery.count({
      where: {
        clientId,
        success: true,
        createdAt: { gte: periodStart },
      },
    })

    const remaining = quota.leadLimit - currentCount
    
    statuses.push({
      quotaId: quota.id,
      leadLimit: quota.leadLimit,
      periodDays: quota.periodDays,
      currentCount,
      remaining,
      isAvailable: remaining > 0,
    })
  }

  return statuses
}

/**
 * Select the best client to receive a lead based on priority
 */
export function selectClient(eligibleClients: EligibleClient[]): EligibleClient | null {
  if (eligibleClients.length === 0) {
    return null
  }

  // Already sorted by priority, return the first one
  return eligibleClients[0]
}

/**
 * Build the request body for CRM API using field mapping
 */
export function buildRequestBody(
  answers: Record<string, { questionKey: string; questionLabel: string; value: unknown }>,
  fieldMapping: FieldMapping,
  meta: {
    submissionId: string
    formId: string
    formSlug: string
    formName: string
    ip: string | null
    userAgent: string | null
    referrer: string | null
    utm: Record<string, string | null> | null
    createdAt: string
  }
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  // Map form fields to CRM fields
  for (const [formField, crmField] of Object.entries(fieldMapping)) {
    if (formField.startsWith('_meta.')) {
      // Handle meta fields
      const metaKey = formField.replace('_meta.', '')
      switch (metaKey) {
        case 'submissionId':
          body[crmField] = meta.submissionId
          break
        case 'formId':
          body[crmField] = meta.formId
          break
        case 'formSlug':
          body[crmField] = meta.formSlug
          break
        case 'formName':
          body[crmField] = meta.formName
          break
        case 'ip':
          body[crmField] = meta.ip
          break
        case 'userAgent':
          body[crmField] = meta.userAgent
          break
        case 'referrer':
          body[crmField] = meta.referrer
          break
        case 'utm_source':
          body[crmField] = meta.utm?.source
          break
        case 'utm_medium':
          body[crmField] = meta.utm?.medium
          break
        case 'utm_campaign':
          body[crmField] = meta.utm?.campaign
          break
        case 'createdAt':
          body[crmField] = meta.createdAt
          break
      }
    } else if (answers[formField]) {
      // Map answer value
      body[crmField] = answers[formField].value
    }
  }

  return body
}

/**
 * Send lead to a CRM client
 */
export async function distributeToClient(
  client: CrmClient,
  submissionId: string,
  formId: string,
  requestBody: Record<string, unknown>
): Promise<DistributionResult> {
  // Create delivery record
  const delivery = await prisma.crmDelivery.create({
    data: {
      clientId: client.id,
      submissionId,
      formId,
      requestBody: JSON.parse(JSON.stringify(requestBody)),
      attempts: 0,
    },
  })

  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add custom headers
    if (client.headers && typeof client.headers === 'object') {
      Object.assign(headers, client.headers)
    }

    // Add API key if configured
    if (client.apiKey) {
      headers['Authorization'] = `Bearer ${client.apiKey}`
    }

    // Make the request
    const response = await fetch(client.apiUrl, {
      method: client.httpMethod,
      headers,
      body: JSON.stringify(requestBody),
    })

    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      await prisma.crmDelivery.update({
        where: { id: delivery.id },
        data: {
          success: true,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 2000),
          attempts: 1,
        },
      })

      return {
        success: true,
        clientId: client.id,
        clientName: client.name,
        deliveryId: delivery.id,
        responseStatus: response.status,
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.crmDelivery.update({
      where: { id: delivery.id },
      data: {
        success: false,
        attempts: 1,
        lastError: errorMessage,
      },
    })

    return {
      success: false,
      clientId: client.id,
      clientName: client.name,
      deliveryId: delivery.id,
      error: errorMessage,
    }
  }
}

/**
 * Main distribution function - called after form submission
 */
export async function distributeSubmission(
  formId: string,
  submissionId: string,
  answers: Record<string, { questionKey: string; questionLabel: string; questionType: string; value: unknown }>,
  meta: {
    formSlug: string
    formName: string
    ip: string | null
    userAgent: string | null
    referrer: string | null
    utm: Record<string, string | null> | null
    createdAt: string
  }
): Promise<DistributionResult> {
  // Get eligible clients
  const eligibleClients = await getEligibleClients(formId)

  if (eligibleClients.length === 0) {
    return {
      success: false,
      error: 'No eligible clients available (all quotas exhausted or no clients configured)',
    }
  }

  // Select the best client
  const selected = selectClient(eligibleClients)
  
  if (!selected) {
    return {
      success: false,
      error: 'No client selected',
    }
  }

  // Build request body using field mapping
  const fieldMapping = (selected.client.fieldMapping as FieldMapping) || {}
  
  // If no field mapping, create a default one with all answers
  const effectiveMapping = Object.keys(fieldMapping).length > 0
    ? fieldMapping
    : Object.fromEntries(
        Object.keys(answers).map(key => [key, key])
      )

  const requestBody = buildRequestBody(
    answers,
    effectiveMapping,
    {
      submissionId,
      formId,
      ...meta,
    }
  )

  // Send to CRM
  return distributeToClient(selected.client, submissionId, formId, requestBody)
}

/**
 * Get quota usage statistics for a client
 */
export async function getClientQuotaStats(clientId: string): Promise<{
  quotas: QuotaStatus[]
  totalDeliveries: number
  successfulDeliveries: number
}> {
  const client = await prisma.crmClient.findUnique({
    where: { id: clientId },
    include: { quotas: true },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const quotas = await checkClientQuotas(clientId, client.quotas)

  const [totalDeliveries, successfulDeliveries] = await Promise.all([
    prisma.crmDelivery.count({ where: { clientId } }),
    prisma.crmDelivery.count({ where: { clientId, success: true } }),
  ])

  return {
    quotas,
    totalDeliveries,
    successfulDeliveries,
  }
}

