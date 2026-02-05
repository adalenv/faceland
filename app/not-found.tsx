import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <FileQuestion className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-lg text-slate-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/admin/forms">
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

