'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createCrmClient } from '@/app/admin/distribution/actions'
import { Plus, Loader2 } from 'lucide-react'

export function CreateClientDialog() {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  async function handleCreate() {
    if (!name.trim() || !apiUrl.trim()) {
      toast({
        title: 'Validation error',
        description: 'Name and API URL are required',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const client = await createCrmClient(
        { name: name.trim(), apiUrl: apiUrl.trim() },
        []
      )
      
      toast({
        title: 'Client created',
        description: 'The CRM client has been created. Configure quotas and field mapping.',
      })
      
      setOpen(false)
      setName('')
      setApiUrl('')
      router.push(`/admin/distribution/clients/${client.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create client',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create CRM Client</DialogTitle>
          <DialogDescription>
            Add a new CRM integration to receive leads. You can configure quotas and
            field mapping after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Salesforce, HubSpot, Custom CRM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input
              id="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/leads"
            />
            <p className="text-xs text-slate-500">
              The endpoint where leads will be sent via HTTP POST
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

