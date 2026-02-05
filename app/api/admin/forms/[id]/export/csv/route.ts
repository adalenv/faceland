import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            answers: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Build CSV
    const questionKeys = form.questions.map((q) => q.key)
    const headers = [
      'Submission ID',
      'Date',
      ...form.questions.map((q) => q.label),
      'IP',
      'User Agent',
      'Referrer',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
    ]

    const rows = form.submissions.map((submission) => {
      const utm = submission.utmJson as Record<string, string | null> | null
      
      return [
        submission.id,
        submission.createdAt.toISOString(),
        ...questionKeys.map((key) => {
          const answer = submission.answers.find((a) => a.questionKey === key)
          if (!answer) return ''
          const value = answer.valueJson
          if (value === null || value === undefined) return ''
          if (typeof value === 'boolean') return value ? 'Yes' : 'No'
          if (Array.isArray(value)) return value.join('; ')
          return String(value)
        }),
        submission.ip || '',
        submission.userAgent || '',
        submission.referrer || '',
        utm?.source || '',
        utm?.medium || '',
        utm?.campaign || '',
      ]
    })

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    const filename = `${form.slug}-leads-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

