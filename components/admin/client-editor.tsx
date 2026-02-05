'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CrmClient, CrmQuota, CrmDelivery, Form } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { updateCrmClient } from '@/app/admin/distribution/actions'
import { formatDate } from '@/lib/utils'
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'

type ClientWithRelations = CrmClient & {
  quotas: CrmQuota[]
  deliveries: (CrmDelivery & {
    form: { name: string; slug: string }
  })[]
}

interface QuotaUsage {
  quotaId: string
  leadLimit: number
  periodDays: number
  currentCount: number
  remaining: number
  percentUsed: number
}

interface ClientEditorProps {
  client: ClientWithRelations
  quotaUsage: QuotaUsage[]
}

interface FieldMappingEntry {
  id: string
  formField: string
  crmField: string
}

interface QuotaEntry {
  id: string
  leadLimit: number
  periodDays: number
}

const COMMON_FORM_FIELDS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'company', label: 'Company' },
  { value: 'message', label: 'Message' },
  { value: '_meta.submissionId', label: 'Submission ID' },
  { value: '_meta.formId', label: 'Form ID' },
  { value: '_meta.formName', label: 'Form Name' },
  { value: '_meta.ip', label: 'IP Address' },
  { value: '_meta.referrer', label: 'Referrer' },
  { value: '_meta.utm_source', label: 'UTM Source' },
  { value: '_meta.utm_medium', label: 'UTM Medium' },
  { value: '_meta.utm_campaign', label: 'UTM Campaign' },
  { value: '_meta.createdAt', label: 'Created At' },
]

const PERIOD_PRESETS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days (week)' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days (month)' },
  { value: 60, label: '60 days (2 months)' },
  { value: 90, label: '90 days (quarter)' },
]

export function ClientEditor({ client, quotaUsage }: ClientEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Basic settings
  const [name, setName] = useState(client.name)
  const [apiUrl, setApiUrl] = useState(client.apiUrl)
  const [apiKey, setApiKey] = useState(client.apiKey || '')
  const [apiSecret, setApiSecret] = useState(client.apiSecret || '')
  const [httpMethod, setHttpMethod] = useState(client.httpMethod)
  const [enabled, setEnabled] = useState(client.enabled)
  const [priority, setPriority] = useState(client.priority)

  // Custom headers
  const [headersJson, setHeadersJson] = useState(
    client.headers ? JSON.stringify(client.headers, null, 2) : ''
  )

  // Field mapping
  const initialMapping = client.fieldMapping as Record<string, string> || {}
  const [fieldMappings, setFieldMappings] = useState<FieldMappingEntry[]>(
    Object.entries(initialMapping).map(([formField, crmField], i) => ({
      id: `mapping-${i}`,
      formField,
      crmField,
    }))
  )

  // Quotas
  const [quotas, setQuotas] = useState<QuotaEntry[]>(
    client.quotas.map((q) => ({
      id: q.id,
      leadLimit: q.leadLimit,
      periodDays: q.periodDays,
    }))
  )

  function addFieldMapping() {
    setFieldMappings([
      ...fieldMappings,
      { id: `mapping-${Date.now()}`, formField: '', crmField: '' },
    ])
  }

  function removeFieldMapping(id: string) {
    setFieldMappings(fieldMappings.filter((m) => m.id !== id))
  }

  function updateFieldMapping(id: string, field: 'formField' | 'crmField', value: string) {
    setFieldMappings(
      fieldMappings.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    )
  }

  function addQuota() {
    setQuotas([
      ...quotas,
      { id: `quota-${Date.now()}`, leadLimit: 10, periodDays: 30 },
    ])
  }

  function removeQuota(id: string) {
    setQuotas(quotas.filter((q) => q.id !== id))
  }

  function updateQuota(id: string, field: 'leadLimit' | 'periodDays', value: number) {
    setQuotas(quotas.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      // Parse headers JSON
      let headers: Record<string, string> | null = null
      if (headersJson.trim()) {
        try {
          headers = JSON.parse(headersJson)
        } catch {
          toast({
            title: 'Invalid JSON',
            description: 'Custom headers must be valid JSON',
            variant: 'destructive',
          })
          setIsSaving(false)
          return
        }
      }

      // Build field mapping object
      const fieldMapping: Record<string, string> = {}
      for (const m of fieldMappings) {
        if (m.formField && m.crmField) {
          fieldMapping[m.formField] = m.crmField
        }
      }

      await updateCrmClient(
        client.id,
        {
          name,
          apiUrl,
          apiKey: apiKey || null,
          apiSecret: apiSecret || null,
          httpMethod,
          headers,
          fieldMapping,
          enabled,
          priority,
        },
        quotas.map((q) => ({
          leadLimit: q.leadLimit,
          periodDays: q.periodDays,
        }))
      )

      toast({
        title: 'Client updated',
        description: 'The CRM client settings have been saved.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save client',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  function formatPeriod(days: number) {
    if (days === 1) return 'day'
    if (days === 7) return 'week'
    if (days === 30) return 'month'
    if (days === 60) return '2 months'
    if (days === 90) return 'quarter'
    return `${days} days`
  }

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="quotas">Quotas</TabsTrigger>
        <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
        <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
            <CardDescription>Configure the CRM client connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Client</Label>
                <p className="text-xs text-slate-500">
                  Disabled clients won&apos;t receive any leads
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-500">
                  Higher priority clients receive leads first
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="httpMethod">HTTP Method</Label>
                <Select value={httpMethod} onValueChange={setHttpMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>API credentials for the CRM endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key / Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer token or API key"
                />
                <p className="text-xs text-slate-500">
                  Sent as Authorization: Bearer header
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret (optional)</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="For signing requests"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="headers">Custom Headers (JSON)</Label>
              <textarea
                id="headers"
                className="w-full h-24 px-3 py-2 text-sm border rounded-md font-mono bg-slate-50"
                value={headersJson}
                onChange={(e) => setHeadersJson(e.target.value)}
                placeholder='{"X-Custom-Header": "value"}'
              />
              <p className="text-xs text-slate-500">
                Additional headers to send with each request
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="quotas" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Quotas</CardTitle>
            <CardDescription>
              Set limits on how many leads this client can receive over time periods.
              Multiple quotas can be combined (e.g., 5/day AND 100/month).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotaUsage.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label>Current Usage</Label>
                  {quotaUsage.map((usage) => (
                    <div key={usage.quotaId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {usage.currentCount} / {usage.leadLimit} leads per{' '}
                          {formatPeriod(usage.periodDays)}
                        </span>
                        <span className="text-slate-500">
                          {usage.remaining} remaining
                        </span>
                      </div>
                      <Progress value={usage.percentUsed} className="h-2" />
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-3">
              <Label>Quota Rules</Label>
              {quotas.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No quotas configured. This client can receive unlimited leads.
                </p>
              ) : (
                quotas.map((quota) => (
                  <div
                    key={quota.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                  >
                    <div className="flex-1 grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Lead Limit</Label>
                        <Input
                          type="number"
                          min={1}
                          value={quota.leadLimit}
                          onChange={(e) =>
                            updateQuota(quota.id, 'leadLimit', parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time Period</Label>
                        <Select
                          value={quota.periodDays.toString()}
                          onValueChange={(v) =>
                            updateQuota(quota.id, 'periodDays', parseInt(v))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERIOD_PRESETS.map((preset) => (
                              <SelectItem
                                key={preset.value}
                                value={preset.value.toString()}
                              >
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuota(quota.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
              <Button variant="outline" onClick={addQuota}>
                <Plus className="mr-2 h-4 w-4" />
                Add Quota Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mapping" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Field Mapping</CardTitle>
            <CardDescription>
              Map form fields to CRM fields. The left side is the form field name,
              the right side is the CRM field name in the API request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldMappings.length === 0 ? (
              <p className="text-sm text-slate-500">
                No field mapping configured. All form fields will be sent with their
                original names.
              </p>
            ) : (
              <div className="space-y-3">
                {fieldMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                  >
                    <div className="flex-1">
                      <Label className="text-xs">Form Field</Label>
                      <Select
                        value={mapping.formField}
                        onValueChange={(v) =>
                          updateFieldMapping(mapping.id, 'formField', v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_FORM_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-xs">CRM Field</Label>
                      <Input
                        value={mapping.crmField}
                        onChange={(e) =>
                          updateFieldMapping(mapping.id, 'crmField', e.target.value)
                        }
                        placeholder="e.g., lead_email"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFieldMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={addFieldMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field Mapping
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
            <CardDescription>
              Last 20 lead deliveries to this CRM client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {client.deliveries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No deliveries yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.deliveries.map((delivery) => (
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
                      <TableCell>{delivery.form.name}</TableCell>
                      <TableCell>
                        {delivery.responseStatus ? (
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {delivery.responseStatus}
                          </code>
                        ) : delivery.lastError ? (
                          <span className="text-xs text-red-500">
                            {delivery.lastError.substring(0, 50)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(delivery.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </Tabs>
  )
}

