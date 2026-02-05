'use client'

import { useState } from 'react'
import { Submission, Answer } from '@prisma/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate, truncate } from '@/lib/utils'
import { Eye, Globe, Monitor, Link2 } from 'lucide-react'

type SubmissionWithAnswers = Submission & {
  answers: Answer[]
}

interface LeadsTableProps {
  submissions: SubmissionWithAnswers[]
}

export function LeadsTable({ submissions }: LeadsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithAnswers | null>(null)

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900">No leads yet</h3>
          <p className="text-slate-500 mt-1">
            Leads will appear here when people submit your form
          </p>
        </div>
      </div>
    )
  }

  // Get unique question keys from all submissions for table headers
  const allKeys = new Set<string>()
  submissions.forEach((sub) => {
    sub.answers.forEach((ans) => {
      allKeys.add(ans.questionKey)
    })
  })
  const questionKeys = Array.from(allKeys).slice(0, 3) // Show first 3 columns

  return (
    <>
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {questionKeys.map((key) => (
                <TableHead key={key} className="capitalize">
                  {key.replace(/_/g, ' ')}
                </TableHead>
              ))}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="text-slate-500">
                  {formatDate(submission.createdAt)}
                </TableCell>
                {questionKeys.map((key) => {
                  const answer = submission.answers.find((a) => a.questionKey === key)
                  const value = answer ? formatAnswerValue(answer.valueJson) : '-'
                  return (
                    <TableCell key={key} className="max-w-[200px]">
                      {truncate(value, 50)}
                    </TableCell>
                  )
                })}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Answers */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Responses</h3>
                <div className="space-y-3">
                  {selectedSubmission.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className="bg-slate-50 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-700">
                          {answer.questionLabel}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {answer.questionType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-slate-900">
                        {formatAnswerValue(answer.valueJson)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Meta */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">IP:</span>
                    <span className="text-slate-900">
                      {selectedSubmission.ip || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">User Agent:</span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    {selectedSubmission.userAgent || 'Unknown'}
                  </div>
                  {selectedSubmission.referrer && (
                    <div className="col-span-2 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500">Referrer:</span>
                      <span className="text-slate-900 truncate">
                        {selectedSubmission.referrer}
                      </span>
                    </div>
                  )}
                  {selectedSubmission.utmJson && (
                    <div className="col-span-2">
                      <span className="text-slate-500">UTM Parameters:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(selectedSubmission.utmJson as Record<string, string>)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <Badge key={k} variant="secondary" className="text-xs">
                              {k}: {v}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="text-sm text-slate-500">
                Submitted: {formatDate(selectedSubmission.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

