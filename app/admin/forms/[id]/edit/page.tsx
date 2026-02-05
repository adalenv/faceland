import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { FormBuilder } from '@/components/admin/form-builder'

interface EditFormPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFormPage({ params }: EditFormPageProps) {
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

  return <FormBuilder form={form} />
}

