'use client'

import { useState, useEffect } from 'react'
import { Question } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuestionType, QuestionConfig } from '@/lib/validations'
import { generateKey } from '@/lib/utils'
import { Plus, Trash2, Loader2 } from 'lucide-react'

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'consent', label: 'Consent' },
]

interface QuestionEditorProps {
  question: Question
  isNew: boolean
  onSave: (data: {
    key: string
    type: QuestionType
    label: string
    required: boolean
    configJson: QuestionConfig | null
  }) => Promise<void>
  onCancel: () => void
}

export function QuestionEditor({
  question,
  isNew,
  onSave,
  onCancel,
}: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(question.type as QuestionType)
  const [label, setLabel] = useState(question.label)
  const [key, setKey] = useState(question.key)
  const [required, setRequired] = useState(question.required)
  const [placeholder, setPlaceholder] = useState('')
  const [consentText, setConsentText] = useState('')
  const [choices, setChoices] = useState<{ id: string; label: string }[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const config = question.configJson as QuestionConfig | null
    if (config) {
      setPlaceholder(config.placeholder || '')
      setConsentText(config.consentText || '')
      setChoices(config.choices || [])
    }
  }, [question])

  function handleLabelChange(value: string) {
    setLabel(value)
    if (isNew && !key) {
      setKey(generateKey(value))
    }
  }

  function addChoice() {
    setChoices([
      ...choices,
      { id: `choice-${Date.now()}`, label: '' },
    ])
  }

  function updateChoice(id: string, label: string) {
    setChoices(choices.map((c) => (c.id === id ? { ...c, label } : c)))
  }

  function removeChoice(id: string) {
    setChoices(choices.filter((c) => c.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const configJson: QuestionConfig = {}
    
    if (placeholder) {
      configJson.placeholder = placeholder
    }
    
    if (type === 'consent' && consentText) {
      configJson.consentText = consentText
    }
    
    if ((type === 'single_choice' || type === 'multiple_choice') && choices.length > 0) {
      configJson.choices = choices.filter((c) => c.label.trim())
    }

    try {
      await onSave({
        key: key || generateKey(label),
        type,
        label,
        required,
        configJson: Object.keys(configJson).length > 0 ? configJson : null,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const showChoices = type === 'single_choice' || type === 'multiple_choice'
  const showPlaceholder = ['short_text', 'long_text', 'email', 'phone'].includes(type)
  const showConsentText = type === 'consent'

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Add Question' : 'Edit Question'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Question Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Question Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., What is your name?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Field Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="e.g., full_name"
                required
              />
              <p className="text-xs text-slate-500">
                Unique identifier for this field (used in exports and webhooks)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="required">Required</Label>
                <p className="text-xs text-slate-500">
                  User must answer this question
                </p>
              </div>
              <Switch
                id="required"
                checked={required}
                onCheckedChange={setRequired}
              />
            </div>

            {showPlaceholder && (
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="e.g., Enter your answer..."
                />
              </div>
            )}

            {showConsentText && (
              <div className="space-y-2">
                <Label htmlFor="consentText">Consent Text</Label>
                <Textarea
                  id="consentText"
                  value={consentText}
                  onChange={(e) => setConsentText(e.target.value)}
                  placeholder="e.g., I agree to the terms and conditions"
                  rows={3}
                />
              </div>
            )}

            {showChoices && (
              <div className="space-y-2">
                <Label>Choices</Label>
                <div className="space-y-2">
                  {choices.map((choice, index) => (
                    <div key={choice.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 w-6">
                        {index + 1}.
                      </span>
                      <Input
                        value={choice.label}
                        onChange={(e) => updateChoice(choice.id, e.target.value)}
                        placeholder="Choice label"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(choice.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChoice}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Choice
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !label}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Question'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

