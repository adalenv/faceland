import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { FormRuntime } from '@/components/public/form-runtime'
import { FormSnapshot } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'

interface PreviewPageProps {
  params: Promise<{ id: string }>
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  await requireAuth()
  
  const { id } = await params
  
  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!form) {
    notFound()
  }

  // Create a preview snapshot from current questions
  const snapshot: FormSnapshot = {
    id: form.id,
    name: form.name,
    slug: form.slug,
    introTitle: form.introTitle,
    introDescription: form.introDescription,
    thankYouTitle: form.thankYouTitle,
    thankYouMessage: form.thankYouMessage,
    redirectUrl: null, // Don't redirect in preview
    redirectDelaySec: null,
    questions: form.questions.map((q) => ({
      key: q.key,
      type: q.type,
      label: q.label,
      required: q.required,
      order: q.order,
      configJson: q.configJson as FormSnapshot['questions'][0]['configJson'],
    })),
  }

  if (form.questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/forms/${id}/edit`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Preview</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No questions yet</h3>
          <p className="text-slate-500 mt-1 mb-4">
            Add some questions to preview your form
          </p>
          <Button asChild>
            <Link href={`/admin/forms/${id}/edit`}>
              Go to Builder
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/forms/${id}/edit`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Preview</h1>
            <p className="text-slate-500 text-sm">
              This is a preview of your form. Submissions will not be saved.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-sm text-slate-500 ml-2">/f/{form.slug}</span>
        </div>
        <div className="h-[600px] overflow-auto">
          <FormRuntime snapshot={snapshot} embedded />
        </div>
      </div>
    </div>
  )
}

