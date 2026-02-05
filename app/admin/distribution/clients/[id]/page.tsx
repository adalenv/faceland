import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getCrmClient, getClientQuotaUsage } from '../../actions'
import { ClientEditor } from '@/components/admin/client-editor'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function ClientEditPage({ params }: PageProps) {
  await requireAuth()
  
  const client = await getCrmClient(params.id)
  
  if (!client) {
    notFound()
  }

  const quotaUsage = await getClientQuotaUsage(params.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/distribution/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-600 mt-1">
            Configure CRM integration settings, quotas, and field mapping
          </p>
        </div>
      </div>

      <ClientEditor client={client} quotaUsage={quotaUsage} />
    </div>
  )
}

