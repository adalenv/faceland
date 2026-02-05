'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Question } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const questionTypeLabels: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  email: 'Email',
  phone: 'Phone',
  consent: 'Consent',
}

interface SortableQuestionProps {
  question: Question
  index: number
  onEdit: () => void
  onDelete: () => void
}

export function SortableQuestion({
  question,
  index,
  onEdit,
  onDelete,
}: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow',
        isDragging && 'shadow-lg opacity-50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <button
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-500">
                {index + 1}.
              </span>
              <span className="font-medium text-slate-900 truncate">
                {question.label || 'Untitled Question'}
              </span>
              {question.required && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="secondary" className="text-xs">
                {questionTypeLabels[question.type] || question.type}
              </Badge>
              <span className="text-xs">Key: {question.key}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

