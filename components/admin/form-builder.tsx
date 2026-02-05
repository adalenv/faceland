'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Form, Question } from '@prisma/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { SortableQuestion } from './sortable-question'
import { QuestionEditor } from './question-editor'
import { 
  updateForm, 
  publishForm, 
  unpublishForm, 
  reorderQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/app/admin/forms/actions'
import { QuestionType, QuestionConfig } from '@/lib/validations'
import { generateKey } from '@/lib/utils'
import {
  ArrowLeft,
  Save,
  Rocket,
  Plus,
  Eye,
  Settings,
  Loader2,
} from 'lucide-react'

type FormWithQuestions = Form & {
  questions: Question[]
}

interface FormBuilderProps {
  form: FormWithQuestions
}

export function FormBuilder({ form: initialForm }: FormBuilderProps) {
  const [form, setForm] = useState(initialForm)
  const [questions, setQuestions] = useState(initialForm.questions)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isNewQuestion, setIsNewQuestion] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)

      const newQuestions = arrayMove(questions, oldIndex, newIndex)
      setQuestions(newQuestions)

      try {
        await reorderQuestions(form.id, newQuestions.map((q) => q.id))
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to reorder questions',
          variant: 'destructive',
        })
        setQuestions(questions)
      }
    }
  }, [questions, form.id, toast])

  async function handleSaveForm() {
    setIsSaving(true)
    try {
      await updateForm(form.id, {
        name: form.name,
        slug: form.slug,
        introTitle: form.introTitle,
        introDescription: form.introDescription,
      })
      toast({
        title: 'Saved',
        description: 'Form settings have been saved.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save form',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    setIsPublishing(true)
    try {
      await publishForm(form.id)
      setForm({ ...form, status: 'published' })
      toast({
        title: 'Published!',
        description: 'Your form is now live.',
        variant: 'success',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to publish form',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  async function handleUnpublish() {
    setIsPublishing(true)
    try {
      await unpublishForm(form.id)
      setForm({ ...form, status: 'draft' })
      toast({
        title: 'Unpublished',
        description: 'Your form is now a draft.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unpublish form',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  function handleAddQuestion() {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      formId: form.id,
      key: '',
      type: 'short_text',
      label: '',
      required: false,
      order: questions.length,
      configJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setEditingQuestion(newQuestion)
    setIsNewQuestion(true)
  }

  async function handleSaveQuestion(data: {
    key: string
    type: QuestionType
    label: string
    required: boolean
    configJson: QuestionConfig | null
  }) {
    if (!editingQuestion) return

    try {
      if (isNewQuestion) {
        const created = await createQuestion(form.id, {
          key: data.key || generateKey(data.label),
          type: data.type,
          label: data.label,
          required: data.required,
          order: questions.length,
          configJson: data.configJson,
        })
        setQuestions([...questions, created])
        toast({
          title: 'Question added',
          description: 'The question has been added to your form.',
        })
      } else {
        const updated = await updateQuestion(editingQuestion.id, form.id, {
          key: data.key,
          type: data.type,
          label: data.label,
          required: data.required,
          configJson: data.configJson,
        })
        setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)))
        toast({
          title: 'Question updated',
          description: 'The question has been updated.',
        })
      }
      setEditingQuestion(null)
      setIsNewQuestion(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save question',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    try {
      await deleteQuestion(questionId, form.id)
      setQuestions(questions.filter((q) => q.id !== questionId))
      toast({
        title: 'Question deleted',
        description: 'The question has been removed from your form.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete question',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{form.name}</h1>
              <Badge variant={form.status === 'published' ? 'success' : 'secondary'}>
                {form.status}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm">/f/{form.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/forms/${form.id}/preview`}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/forms/${form.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveForm}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          {form.status === 'published' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing || questions.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Intro Screen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="introTitle">Title</Label>
                <Input
                  id="introTitle"
                  value={form.introTitle || ''}
                  onChange={(e) => setForm({ ...form, introTitle: e.target.value })}
                  placeholder="Welcome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="introDescription">Description</Label>
                <Textarea
                  id="introDescription"
                  value={form.introDescription || ''}
                  onChange={(e) => setForm({ ...form, introDescription: e.target.value })}
                  placeholder="Please fill out this form"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
            <Button size="sm" onClick={handleAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-slate-500 mb-4">No questions yet</p>
                <Button onClick={handleAddQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      onEdit={() => {
                        setEditingQuestion(question)
                        setIsNewQuestion(false)
                      }}
                      onDelete={() => handleDeleteQuestion(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Question Editor Dialog */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          isNew={isNewQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setEditingQuestion(null)
            setIsNewQuestion(false)
          }}
        />
      )}
    </div>
  )
}

