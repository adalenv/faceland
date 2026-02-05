import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PublicSubmissionSchema, FormSnapshot, validateAnswer, QuestionConfig } from '@/lib/validations'
import { enqueueWebhook, WebhookPayload } from '@/lib/webhook'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const parsed = PublicSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { formSlug, answers, meta } = parsed.data

    // Get form with published version
    const form = await prisma.form.findUnique({
      where: { slug: formSlug },
      include: { publishedVersion: true },
    })

    if (!form || form.status !== 'published' || !form.publishedVersion) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 }
      )
    }

    const snapshot = form.publishedVersion.snapshotJson as FormSnapshot

    // Validate all answers
    for (const question of snapshot.questions) {
      const value = answers[question.key]
      const config = question.configJson as QuestionConfig | null
      const result = validateAnswer(question.type, value, question.required, config)
      
      if (!result.valid) {
        return NextResponse.json(
          { error: `Invalid answer for "${question.label}": ${result.error}` },
          { status: 400 }
        )
      }
    }

    // Get client info
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const userAgent = request.headers.get('user-agent') || null
    const referrer = meta?.referrer || request.headers.get('referer') || null

    // Build UTM JSON
    const utmJson = meta ? {
      source: meta.utmSource,
      medium: meta.utmMedium,
      campaign: meta.utmCampaign,
      term: meta.utmTerm,
      content: meta.utmContent,
    } : null

    // Create submission with answers
    const submission = await prisma.submission.create({
      data: {
        formId: form.id,
        ip,
        userAgent,
        referrer,
        utmJson: utmJson ? JSON.parse(JSON.stringify(utmJson)) : undefined,
        answers: {
          create: snapshot.questions.map((question) => ({
            questionKey: question.key,
            questionLabel: question.label,
            questionType: question.type,
            valueJson: JSON.parse(JSON.stringify(answers[question.key] ?? null)),
          })),
        },
      },
      include: {
        answers: true,
      },
    })

    // Enqueue webhook if enabled
    if (form.webhookEnabled && form.webhookUrl) {
      const payload: WebhookPayload = {
        event: 'lead.created',
        timestamp: new Date().toISOString(),
        formId: form.id,
        formSlug: form.slug,
        formName: form.name,
        submissionId: submission.id,
        answers: Object.fromEntries(
          submission.answers.map((a) => [
            a.questionKey,
            {
              questionKey: a.questionKey,
              questionLabel: a.questionLabel,
              questionType: a.questionType,
              value: a.valueJson,
            },
          ])
        ),
        meta: {
          ip: submission.ip,
          userAgent: submission.userAgent,
          referrer: submission.referrer,
          utm: submission.utmJson as Record<string, string | null> | null,
          createdAt: submission.createdAt.toISOString(),
        },
      }

      await enqueueWebhook(
        form.id,
        submission.id,
        form.webhookUrl,
        payload,
        form.webhookSecret
      )
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
    })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

