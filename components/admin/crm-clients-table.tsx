'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CrmClient, CrmQuota } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { toggleCrmClient, deleteCrmClient } from '@/app/admin/distribution/actions'
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'

type ClientWithQuotas = CrmClient & {
  quotas: CrmQuota[]
  _count: { deliveries: number }
}

interface CrmClientsTableProps {
  clients: ClientWithQuotas[]
}

export function CrmClientsTable({ clients }: CrmClientsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggleCrmClient(id, enabled)
      toast({
        title: enabled ? 'Client enabled' : 'Client disabled',
        description: `The client has been ${enabled ? 'enabled' : 'disabled'}.`,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update client status',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    
    setIsDeleting(true)
    try {
      await deleteCrmClient(deleteId)
      toast({
        title: 'Client deleted',
        description: 'The CRM client has been deleted.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  function formatQuota(quota: CrmQuota) {
    const period = quota.periodDays === 1 
      ? 'day' 
      : quota.periodDays === 7 
        ? 'week' 
        : quota.periodDays === 30 
          ? 'month' 
          : `${quota.periodDays} days`
    return `${quota.leadLimit}/${period}`
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
        <h3 className="text-lg font-medium text-slate-900">No CRM clients</h3>
        <p className="text-slate-600 mt-1">
          Create your first CRM client to start distributing leads.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>API URL</TableHead>
              <TableHead>Quotas</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Deliveries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/distribution/clients/${client.id}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate block">
                    {client.apiUrl}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {client.quotas.length === 0 ? (
                      <span className="text-slate-400 text-sm">No limits</span>
                    ) : (
                      client.quotas.map((quota) => (
                        <Badge key={quota.id} variant="secondary" className="text-xs">
                          {formatQuota(quota)}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{client.priority}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">{client._count.deliveries}</span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={client.enabled}
                    onCheckedChange={(checked) => handleToggle(client.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/distribution/clients/${client.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={client.apiUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open API URL
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteId(client.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CRM Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this CRM client? This will also delete all
              delivery logs associated with this client. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

