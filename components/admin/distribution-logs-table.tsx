'use client'

import { useState, useMemo } from 'react'
import { CrmDelivery } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Eye, Filter, X } from 'lucide-react'

type DeliveryWithRelations = CrmDelivery & {
  client: { id: string; name: string }
  form: { id: string; name: string; slug: string }
}

interface DistributionLogsTableProps {
  deliveries: DeliveryWithRelations[]
  clients: { id: string; name: string }[]
  forms: { id: string; name: string }[]
}

export function DistributionLogsTable({
  deliveries,
  clients,
  forms,
}: DistributionLogsTableProps) {
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [formFilter, setFormFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithRelations | null>(null)

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (clientFilter !== 'all' && d.clientId !== clientFilter) return false
      if (formFilter !== 'all' && d.formId !== formFilter) return false
      if (statusFilter === 'success' && !d.success) return false
      if (statusFilter === 'failed' && d.success) return false
      return true
    })
  }, [deliveries, clientFilter, formFilter, statusFilter])

  const hasFilters = clientFilter !== 'all' || formFilter !== 'all' || statusFilter !== 'all'

  function clearFilters() {
    setClientFilter('all')
    setFormFilter('all')
    setStatusFilter('all')
  }

  const stats = useMemo(() => {
    const total = filteredDeliveries.length
    const successful = filteredDeliveries.filter((d) => d.success).length
    const failed = total - successful
    return { total, successful, failed }
  }, [filteredDeliveries])

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg">
          <Filter className="h-4 w-4 text-slate-500" />
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={formFilter} onValueChange={setFormFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forms</SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-4 text-sm text-slate-600">
            <span>Total: {stats.total}</span>
            <span className="text-green-600">Success: {stats.successful}</span>
            <span className="text-red-600">Failed: {stats.failed}</span>
          </div>
        </div>

        {/* Table */}
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-slate-900">No deliveries found</h3>
            <p className="text-slate-600 mt-1">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Lead deliveries will appear here once forms are submitted'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      {delivery.success ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {delivery.client.name}
                    </TableCell>
                    <TableCell>{delivery.form.name}</TableCell>
                    <TableCell>
                      {delivery.responseStatus ? (
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {delivery.responseStatus}
                        </code>
                      ) : delivery.lastError ? (
                        <span className="text-xs text-red-500 max-w-[200px] truncate block">
                          {delivery.lastError}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{delivery.attempts}</TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(delivery.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              {selectedDelivery?.client.name} → {selectedDelivery?.form.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className="ml-2">
                    {selectedDelivery.success ? (
                      <Badge variant="success">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Response Code:</span>
                  <span className="ml-2">
                    {selectedDelivery.responseStatus || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Attempts:</span>
                  <span className="ml-2">{selectedDelivery.attempts}</span>
                </div>
                <div>
                  <span className="text-slate-500">Date:</span>
                  <span className="ml-2">
                    {formatDate(selectedDelivery.createdAt)}
                  </span>
                </div>
              </div>

              {selectedDelivery.lastError && (
                <div>
                  <span className="text-sm text-slate-500">Error:</span>
                  <pre className="mt-1 p-3 bg-red-50 text-red-700 rounded text-xs overflow-x-auto">
                    {selectedDelivery.lastError}
                  </pre>
                </div>
              )}

              <div>
                <span className="text-sm text-slate-500">Request Body:</span>
                <pre className="mt-1 p-3 bg-slate-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedDelivery.requestBody, null, 2)}
                </pre>
              </div>

              {selectedDelivery.responseBody && (
                <div>
                  <span className="text-sm text-slate-500">Response Body:</span>
                  <pre className="mt-1 p-3 bg-slate-100 rounded text-xs overflow-x-auto">
                    {selectedDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

