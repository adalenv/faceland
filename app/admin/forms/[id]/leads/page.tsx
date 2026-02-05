import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { LeadsTable } from '@/components/admin/leads-table'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'

interface LeadsPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadsPage({ params }: LeadsPageProps) {
  await requireAuth()
  
  const { id } = await params
  
  const form = await prisma.form.findUnique({
    where: { id },
  })

  if (!form) {
    notFound()
  }

  const submissions = await prisma.submission.findMany({
    where: { formId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      answers: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Leads - {form.name}
            </h1>
            <p className="text-slate-500 text-sm">
              {submissions.length} total submissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/admin/forms/${id}/export/csv`} download>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <LeadsTable submissions={submissions} />
    </div>
  )
}

