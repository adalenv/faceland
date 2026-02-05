import crypto from 'crypto'
import { prisma } from './db'

export interface WebhookPayload {
  event: 'lead.created'
  timestamp: string
  formId: string
  formSlug: string
  formName: string
  submissionId: string
  answers: Record<string, {
    questionKey: string
    questionLabel: string
    questionType: string
    value: unknown
  }>
  meta: {
    ip: string | null
    userAgent: string | null
    referrer: string | null
    utm: Record<string, string | null> | null
    createdAt: string
  }
}

export function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Retry delays in milliseconds: 1s, 5s, 25s
const RETRY_DELAYS = [1000, 5000, 25000]
const MAX_ATTEMPTS = 3

export async function enqueueWebhook(
  formId: string,
  submissionId: string,
  url: string,
  payload: WebhookPayload,
  secret: string | null
): Promise<string> {
  const delivery = await prisma.webhookDelivery.create({
    data: {
      formId,
      submissionId,
      url,
      requestBodyJson: payload as object,
      attempts: 0,
      nextAttemptAt: new Date(),
    },
  })

  // Trigger immediate delivery attempt
  processWebhookDelivery(delivery.id, secret).catch(console.error)

  return delivery.id
}

export async function processWebhookDelivery(
  deliveryId: string,
  secret: string | null
): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  })

  if (!delivery || delivery.success || delivery.attempts >= MAX_ATTEMPTS) {
    return
  }

  const payload = JSON.stringify(delivery.requestBodyJson)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (secret) {
    headers['X-Signature'] = signPayload(payload, secret)
  }

  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers,
      body: payload,
    })

    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          success: true,
          responseStatus: response.status,
          responseBodyText: responseBody.substring(0, 1000),
          attempts: delivery.attempts + 1,
          lastError: null,
          nextAttemptAt: null,
        },
      })
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const newAttempts = delivery.attempts + 1

    let nextAttemptAt: Date | null = null
    if (newAttempts < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS[newAttempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
      nextAttemptAt = new Date(Date.now() + delay)
    }

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: newAttempts,
        lastError: errorMessage,
        nextAttemptAt,
        responseStatus: null,
        responseBodyText: null,
      },
    })

    // Schedule retry if there are attempts remaining
    if (nextAttemptAt) {
      const delay = nextAttemptAt.getTime() - Date.now()
      setTimeout(() => {
        processWebhookDelivery(deliveryId, secret).catch(console.error)
      }, delay)
    }
  }
}

export async function processPendingWebhooks(): Promise<void> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      success: false,
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: new Date() },
    },
    include: {
      form: {
        select: { webhookSecret: true },
      },
    },
  })

  for (const delivery of pendingDeliveries) {
    processWebhookDelivery(delivery.id, delivery.form.webhookSecret).catch(console.error)
  }
}

