import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { signPayload, WebhookPayload } from '@/lib/webhook'

export async function POST(request: NextRequest) {
  // Check authentication
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { formId, webhookUrl, webhookSecret } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      )
    }

    // Create test payload
    const payload: WebhookPayload = {
      event: 'lead.created',
      timestamp: new Date().toISOString(),
      formId: formId || 'test-form-id',
      formSlug: 'test-form',
      formName: 'Test Form',
      submissionId: 'test-submission-id',
      answers: {
        email: {
          questionKey: 'email',
          questionLabel: 'Email Address',
          questionType: 'email',
          value: 'test@example.com',
        },
        name: {
          questionKey: 'name',
          questionLabel: 'Full Name',
          questionType: 'short_text',
          value: 'Test User',
        },
      },
      meta: {
        ip: '127.0.0.1',
        userAgent: 'Test Webhook',
        referrer: null,
        utm: null,
        createdAt: new Date().toISOString(),
      },
    }

    const body = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (webhookSecret) {
      headers['X-Signature'] = signPayload(body, webhookSecret)
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
    })

    const responseText = await response.text().catch(() => '')

    if (response.ok) {
      return NextResponse.json({
        success: true,
        status: response.status,
        response: responseText.substring(0, 500),
      })
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    })
  }
}

