import { FileQuestion } from 'lucide-react'

export default function FormNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
          <FileQuestion className="h-10 w-10 text-slate-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Form Not Found
        </h1>
        <p className="text-slate-600">
          This form doesn&apos;t exist or is no longer available.
        </p>
      </div>
    </div>
  )
}

