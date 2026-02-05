'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, LogOut, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/admin/actions'

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/admin/forms" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              Faceland
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/admin/forms"
              className={cn(
                'text-sm font-medium transition-colors hover:text-blue-600',
                pathname === '/admin/forms' || pathname.startsWith('/admin/forms/')
                  ? 'text-blue-600'
                  : 'text-slate-600'
              )}
            >
              Forms
            </Link>
            <Link
              href="/admin/distribution"
              className={cn(
                'text-sm font-medium transition-colors hover:text-blue-600 flex items-center gap-1.5',
                pathname.startsWith('/admin/distribution')
                  ? 'text-blue-600'
                  : 'text-slate-600'
              )}
            >
              <Share2 className="h-4 w-4" />
              Distribution
            </Link>
          </nav>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-slate-600 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  )
}

