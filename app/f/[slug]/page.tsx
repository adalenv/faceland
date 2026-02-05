import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { FormRuntime } from '@/components/public/form-runtime'
import { FormSnapshot } from '@/lib/validations'

interface PublicFormPageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params
  
  const form = await prisma.form.findUnique({
    where: { slug },
    include: {
      publishedVersion: true,
    },
  })

  if (!form || form.status !== 'published' || !form.publishedVersion) {
    notFound()
  }

  const snapshot = form.publishedVersion.snapshotJson as FormSnapshot

  return <FormRuntime snapshot={snapshot} />
}

export async function generateMetadata({ params }: PublicFormPageProps) {
  const { slug } = await params
  
  const form = await prisma.form.findUnique({
    where: { slug },
    include: {
      publishedVersion: true,
    },
  })

  if (!form || !form.publishedVersion) {
    return { title: 'Form Not Found' }
  }

  const snapshot = form.publishedVersion.snapshotJson as FormSnapshot

  return {
    title: snapshot.introTitle || snapshot.name,
    description: snapshot.introDescription || 'Fill out this form',
  }
}

