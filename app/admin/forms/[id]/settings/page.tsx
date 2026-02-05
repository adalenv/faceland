import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { FormSettings } from '@/components/admin/form-settings'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  await requireAuth()
  
  const { id } = await params
  
  const [form, crmClients] = await Promise.all([
    prisma.form.findUnique({
      where: { id },
      include: {
        webhookDeliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        distributionClients: {
          include: {
            client: {
              include: { quotas: true },
            },
          },
        },
      },
    }),
    prisma.crmClient.findMany({
      where: { enabled: true },
      include: { quotas: true },
      orderBy: { priority: 'desc' },
    }),
  ])

  if (!form) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Settings - {form.name}
          </h1>
          <p className="text-slate-500 text-sm">/f/{form.slug}</p>
        </div>
      </div>

      <FormSettings 
        form={form} 
        webhookDeliveries={form.webhookDeliveries}
        distributionClients={form.distributionClients}
        availableCrmClients={crmClients}
      />
    </div>
  )
}

