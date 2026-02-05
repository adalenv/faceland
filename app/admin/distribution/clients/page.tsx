import { requireAuth } from '@/lib/auth'
import { getCrmClients } from '../actions'
import { CrmClientsTable } from '@/components/admin/crm-clients-table'
import { CreateClientDialog } from '@/components/admin/create-client-dialog'

export default async function CrmClientsPage() {
  await requireAuth()
  
  const clients = await getCrmClients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM Clients</h1>
          <p className="text-slate-600 mt-1">
            Manage CRM integrations and lead distribution quotas
          </p>
        </div>
        <CreateClientDialog />
      </div>

      <CrmClientsTable clients={clients} />
    </div>
  )
}

