import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { FormsTable } from '@/components/admin/forms-table'
import { CreateFormDialog } from '@/components/admin/create-form-dialog'

export default async function FormsPage() {
  await requireAuth()
  
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { submissions: true, questions: true },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forms</h1>
          <p className="text-slate-500 mt-1">Create and manage your lead capture forms</p>
        </div>
        <CreateFormDialog />
      </div>

      <FormsTable forms={forms} />
    </div>
  )
}

