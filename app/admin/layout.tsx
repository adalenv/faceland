import { requireAuth, isAuthenticated } from '@/lib/auth'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if we're on the login page by checking auth status
  const authenticated = await isAuthenticated()
  
  // If not authenticated, just render children (login page handles its own layout)
  if (!authenticated) {
    return <>{children}</>
  }
  
  // Require auth for all other admin pages
  await requireAuth()
  
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

