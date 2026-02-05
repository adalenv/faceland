'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Form, WebhookDelivery, CrmClient, CrmQuota, FormDistributionClient } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { updateForm, updateFormDistribution } from '@/app/admin/forms/actions'
import { formatDate } from '@/lib/utils'
import {
  Save,
  Loader2,
  Copy,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Share2,
  ExternalLink,
} from 'lucide-react'

type CrmClientWithQuotas = CrmClient & { quotas: CrmQuota[] }
type FormDistributionClientWithClient = FormDistributionClient & {
  client: CrmClientWithQuotas
}

interface FormSettingsProps {
  form: Form
  webhookDeliveries: WebhookDelivery[]
  distributionClients?: FormDistributionClientWithClient[]
  availableCrmClients?: CrmClientWithQuotas[]
}

interface ClientConfig {
  clientId: string
  enabled: boolean
  priority: number | null
}

export function FormSettings({ 
  form: initialForm, 
  webhookDeliveries,
  distributionClients = [],
  availableCrmClients = [],
}: FormSettingsProps) {
  const [form, setForm] = useState(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSavingDistribution, setIsSavingDistribution] = useState(false)
  const [customSubmitUrl, setCustomSubmitUrl] = useState('')
  const [distributionEnabled, setDistributionEnabled] = useState(form.distributionEnabled)
  const [clientConfigs, setClientConfigs] = useState<ClientConfig[]>(() => {
    // Initialize from existing distribution clients
    const existingMap = new Map(
      distributionClients.map((dc) => [dc.clientId, { enabled: dc.enabled, priority: dc.priority }])
    )
    return availableCrmClients.map((client) => ({
      clientId: client.id,
      enabled: existingMap.get(client.id)?.enabled ?? false,
      priority: existingMap.get(client.id)?.priority ?? null,
    }))
  })
  const router = useRouter()
  const { toast } = useToast()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const formUrl = `${appUrl}/f/${form.slug}`
  const iframeCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`

  async function handleSave() {
    setIsSaving(true)
    try {
      await updateForm(form.id, {
        name: form.name,
        slug: form.slug,
        thankYouTitle: form.thankYouTitle,
        thankYouMessage: form.thankYouMessage,
        redirectUrl: form.redirectUrl || '',
        redirectDelaySec: form.redirectDelaySec,
        webhookUrl: form.webhookUrl || '',
        webhookEnabled: form.webhookEnabled,
        webhookSecret: form.webhookSecret,
      })
      toast({
        title: 'Settings saved',
        description: 'Your form settings have been updated.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestWebhook() {
    if (!form.webhookUrl) {
      toast({
        title: 'No webhook URL',
        description: 'Please enter a webhook URL first.',
        variant: 'destructive',
      })
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch('/api/admin/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          webhookUrl: form.webhookUrl,
          webhookSecret: form.webhookSecret,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Test successful',
          description: `Webhook responded with status ${result.status}`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Test failed',
          description: result.error || 'Webhook request failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test webhook',
        variant: 'destructive',
      })
    } finally {
      setIsTesting(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  function updateClientConfig(clientId: string, field: 'enabled' | 'priority', value: boolean | number | null) {
    setClientConfigs((prev) =>
      prev.map((c) =>
        c.clientId === clientId ? { ...c, [field]: value } : c
      )
    )
  }

  async function handleSaveDistribution() {
    setIsSavingDistribution(true)
    try {
      const enabledConfigs = clientConfigs.filter((c) => c.enabled)
      await updateFormDistribution(form.id, distributionEnabled, enabledConfigs)
      toast({
        title: 'Distribution settings saved',
        description: 'Lead distribution configuration has been updated.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save distribution settings',
        variant: 'destructive',
      })
    } finally {
      setIsSavingDistribution(false)
    }
  }

  function formatQuota(quota: CrmQuota) {
    const period = quota.periodDays === 1 
      ? 'day' 
      : quota.periodDays === 7 
        ? 'week' 
        : quota.periodDays === 30 
          ? 'month' 
          : `${quota.periodDays}d`
    return `${quota.leadLimit}/${period}`
  }

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="thankyou">Thank You</TabsTrigger>
        <TabsTrigger value="webhook">Webhook</TabsTrigger>
        <TabsTrigger value="distribution">Distribution</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
            <CardDescription>Basic information about your form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">/f/</span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="thankyou" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thank You Screen</CardTitle>
            <CardDescription>Customize what users see after submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="thankYouTitle">Title</Label>
              <Input
                id="thankYouTitle"
                value={form.thankYouTitle || ''}
                onChange={(e) => setForm({ ...form, thankYouTitle: e.target.value })}
                placeholder="Thank you!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thankYouMessage">Message</Label>
              <Textarea
                id="thankYouMessage"
                value={form.thankYouMessage || ''}
                onChange={(e) => setForm({ ...form, thankYouMessage: e.target.value })}
                placeholder="Your response has been recorded."
                rows={3}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
              <Input
                id="redirectUrl"
                type="url"
                value={form.redirectUrl || ''}
                onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
                placeholder="https://example.com/thank-you"
              />
              <p className="text-xs text-slate-500">
                Redirect users to this URL after showing the thank you screen
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectDelay">Redirect Delay (seconds)</Label>
              <Input
                id="redirectDelay"
                type="number"
                min={0}
                max={60}
                value={form.redirectDelaySec || 5}
                onChange={(e) => setForm({ ...form, redirectDelaySec: parseInt(e.target.value) || 5 })}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="webhook" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Webhook Settings</CardTitle>
            <CardDescription>
              Send lead data to your server when a form is submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {distributionEnabled && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Lead Distribution is enabled for this form. 
                  Webhooks are disabled when distribution is active. 
                  Disable distribution in the Distribution tab to use webhooks.
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={distributionEnabled ? 'text-slate-400' : ''}>Enable Webhook</Label>
                <p className="text-xs text-slate-500">
                  POST lead data to your endpoint
                </p>
              </div>
              <Switch
                checked={form.webhookEnabled && !distributionEnabled}
                onCheckedChange={(checked) => setForm({ ...form, webhookEnabled: checked })}
                disabled={distributionEnabled}
              />
            </div>

            {form.webhookEnabled && !distributionEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    value={form.webhookUrl || ''}
                    onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                    placeholder="https://your-server.com/webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (optional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={form.webhookSecret || ''}
                    onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                    placeholder="your-secret-key"
                  />
                  <p className="text-xs text-slate-500">
                    Used to sign requests with HMAC-SHA256 (X-Signature header)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={isTesting || !form.webhookUrl}
                >
                  {isTesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Test
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {webhookDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery Log</CardTitle>
              <CardDescription>Recent webhook delivery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        {delivery.success ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </Badge>
                        ) : delivery.attempts >= 3 ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
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
                      <TableCell>{delivery.attempts}/3</TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(delivery.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="distribution" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Lead Distribution
            </CardTitle>
            <CardDescription>
              Automatically send leads to CRM clients based on quotas and priority
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Distribution</Label>
                <p className="text-xs text-slate-500">
                  Automatically distribute leads to configured CRM clients
                </p>
              </div>
              <Switch
                checked={distributionEnabled}
                onCheckedChange={setDistributionEnabled}
              />
            </div>

            {distributionEnabled && (
              <>
                <Separator />
                
                {availableCrmClients.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed">
                    <p className="text-slate-600">No CRM clients configured</p>
                    <Button variant="link" asChild className="mt-2">
                      <Link href="/admin/distribution/clients">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Configure CRM Clients
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label>Select CRM Clients</Label>
                    <p className="text-xs text-slate-500">
                      Choose which clients should receive leads from this form.
                      If none selected, all enabled clients will be used.
                    </p>
                    
                    <div className="border rounded-lg divide-y">
                      {availableCrmClients.map((client) => {
                        const config = clientConfigs.find((c) => c.clientId === client.id)
                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={config?.enabled ?? false}
                                onCheckedChange={(checked) =>
                                  updateClientConfig(client.id, 'enabled', !!checked)
                                }
                              />
                              <div>
                                <div className="font-medium">{client.name}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <span>Priority: {client.priority}</span>
                                  {client.quotas.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        Quotas:{' '}
                                        {client.quotas.map((q) => formatQuota(q)).join(', ')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {config?.enabled && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500">Override Priority:</Label>
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  placeholder={String(client.priority)}
                                  value={config.priority ?? ''}
                                  onChange={(e) =>
                                    updateClientConfig(
                                      client.id,
                                      'priority',
                                      e.target.value ? parseInt(e.target.value) : null
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveDistribution} disabled={isSavingDistribution}>
            {isSavingDistribution ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Distribution Settings
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="export" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Iframe Embed</CardTitle>
            <CardDescription>
              Embed your form on any website using an iframe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              {iframeCode}
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(iframeCode, 'Iframe code')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Iframe Code
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standalone HTML</CardTitle>
            <CardDescription>
              Download a self-contained HTML file that can be hosted anywhere
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              The exported HTML file includes the form UI and submits data to the specified endpoint.
            </p>
            <div className="space-y-2">
              <Label htmlFor="customSubmitUrl">Custom Submit URL (optional)</Label>
              <Input
                id="customSubmitUrl"
                type="url"
                value={customSubmitUrl}
                onChange={(e) => setCustomSubmitUrl(e.target.value)}
                placeholder={`${appUrl}/api/public/submit`}
              />
              <p className="text-xs text-slate-500">
                Leave empty to use the default: {appUrl}/api/public/submit
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a 
                  href={`/api/admin/forms/${form.id}/export/html${customSubmitUrl ? `?submitUrl=${encodeURIComponent(customSubmitUrl)}` : ''}`} 
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download HTML
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(formUrl, 'Form URL')}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Form URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Leads</CardTitle>
            <CardDescription>
              Download all leads as a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href={`/api/admin/forms/${form.id}/export/csv`} download>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </a>
            </Button>
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
          Save Settings
        </Button>
      </div>
    </Tabs>
  )
}

