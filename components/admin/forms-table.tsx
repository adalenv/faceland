'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Form, FormStatus } from '@prisma/client'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import { deleteForm } from '@/app/admin/forms/actions'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Settings,
  Users,
  ExternalLink,
} from 'lucide-react'

type FormWithCounts = Form & {
  _count: {
    submissions: number
    questions: number
  }
}

interface FormsTableProps {
  forms: FormWithCounts[]
}

export function FormsTable({ forms }: FormsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<FormWithCounts | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    if (!formToDelete) return

    setIsDeleting(true)
    try {
      await deleteForm(formToDelete.id)
      toast({
        title: 'Form deleted',
        description: 'The form has been deleted successfully.',
      })
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete form',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900">No forms yet</h3>
          <p className="text-slate-500 mt-1">Create your first form to start collecting leads</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Questions</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">{form.name}</TableCell>
                <TableCell>
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                    /f/{form.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <StatusBadge status={form.status} />
                </TableCell>
                <TableCell className="text-center">{form._count.questions}</TableCell>
                <TableCell className="text-center">{form._count.submissions}</TableCell>
                <TableCell className="text-slate-500">
                  {formatDate(form.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/forms/${form.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Builder
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/forms/${form.id}/leads`}>
                          <Users className="mr-2 h-4 w-4" />
                          View Leads
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/forms/${form.id}/settings`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {form.status === 'published' && (
                        <DropdownMenuItem asChild>
                          <Link href={`/f/${form.slug}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Live Form
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/forms/${form.id}/preview`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => {
                          setFormToDelete(form)
                          setDeleteDialogOpen(true)
                        }}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{formToDelete?.name}&quot;? This will also delete
              all {formToDelete?._count.submissions} leads and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatusBadge({ status }: { status: FormStatus }) {
  if (status === 'published') {
    return <Badge variant="success">Published</Badge>
  }
  return <Badge variant="secondary">Draft</Badge>
}

