import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DistributionLogsTable } from '@/components/admin/distribution-logs-table'

export default async function DistributionLogsPage() {
  await requireAuth()

  const [deliveries, clients, forms] = await Promise.all([
    prisma.crmDelivery.findMany({
      include: {
        client: { select: { id: true, name: true } },
        form: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.crmClient.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.form.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Distribution Logs</h1>
        <p className="text-slate-600 mt-1">
          View all CRM lead delivery attempts and their status
        </p>
      </div>

      <DistributionLogsTable
        deliveries={deliveries}
        clients={clients}
        forms={forms}
      />
    </div>
  )
}

