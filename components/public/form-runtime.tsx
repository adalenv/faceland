'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormSnapshot, AnswerValue, validateAnswer, QuestionConfig } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'

interface FormRuntimeProps {
  snapshot: FormSnapshot
  embedded?: boolean
}

type FormState = 'intro' | 'questions' | 'submitting' | 'thankyou'

export function FormRuntime({ snapshot, embedded = false }: FormRuntimeProps) {
  const [state, setState] = useState<FormState>('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [error, setError] = useState<string | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

  const questions = snapshot.questions.sort((a, b) => a.order - b.order)
  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  // Handle redirect countdown
  useEffect(() => {
    if (state === 'thankyou' && snapshot.redirectUrl && snapshot.redirectDelaySec) {
      setRedirectCountdown(snapshot.redirectDelaySec)
      
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            window.location.href = snapshot.redirectUrl!
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [state, snapshot.redirectUrl, snapshot.redirectDelaySec])

  const validateCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return true

    const value = answers[currentQuestion.key]
    const config = currentQuestion.configJson as QuestionConfig | null
    const result = validateAnswer(
      currentQuestion.type,
      value,
      currentQuestion.required,
      config
    )

    if (!result.valid) {
      setError(result.error || 'Invalid answer')
      return false
    }

    setError(null)
    return true
  }, [currentQuestion, answers])

  const submitForm = useCallback(async () => {
    if (!validateCurrentAnswer()) return

    setState('submitting')

    try {
      // Collect UTM params from URL
      const urlParams = new URLSearchParams(window.location.search)
      const meta = {
        referrer: document.referrer || null,
        utmSource: urlParams.get('utm_source'),
        utmMedium: urlParams.get('utm_medium'),
        utmCampaign: urlParams.get('utm_campaign'),
        utmTerm: urlParams.get('utm_term'),
        utmContent: urlParams.get('utm_content'),
      }

      const response = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formSlug: snapshot.slug,
          answers,
          meta,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Submission failed')
      }

      setState('thankyou')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
      setState('questions')
    }
  }, [validateCurrentAnswer, snapshot.slug, answers])

  const handleNext = useCallback(() => {
    if (!validateCurrentAnswer()) return

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setError(null)
    } else {
      submitForm()
    }
  }, [currentIndex, questions.length, validateCurrentAnswer, submitForm])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setError(null)
    }
  }

  const handleAnswerChange = (value: AnswerValue) => {
    if (!currentQuestion) return

    setAnswers({ ...answers, [currentQuestion.key]: value })
    setError(null)

    // Auto-advance for single choice questions
    if (currentQuestion.type === 'single_choice' && value) {
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          submitForm()
        }
      }, 300)
    }
  }

  // Intro screen
  if (state === 'intro') {
    return (
      <div className={cn('form-runtime', !embedded && 'min-h-screen')}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="form-card w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {snapshot.introTitle || 'Welcome'}
            </h1>
            {snapshot.introDescription && (
              <p className="text-slate-600 mb-8 text-lg">
                {snapshot.introDescription}
              </p>
            )}
            <Button
              size="lg"
              onClick={() => setState('questions')}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8"
            >
              Start
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Submitting state
  if (state === 'submitting') {
    return (
      <div className={cn('form-runtime', !embedded && 'min-h-screen')}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="form-card w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-600">Submitting your response...</p>
          </div>
        </div>
      </div>
    )
  }

  // Thank you screen
  if (state === 'thankyou') {
    return (
      <div className={cn('form-runtime', !embedded && 'min-h-screen')}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="form-card w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {snapshot.thankYouTitle || 'Thank you!'}
            </h1>
            <p className="text-slate-600 text-lg">
              {snapshot.thankYouMessage || 'Your response has been recorded.'}
            </p>
            {snapshot.redirectUrl && redirectCountdown !== null && (
              <p className="text-slate-500 mt-6 text-sm">
                Redirecting in {redirectCountdown} seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Questions
  return (
    <div className={cn('form-runtime', !embedded && 'min-h-screen')}>
      <div className="flex flex-col min-h-screen">
        {/* Progress bar */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="form-card w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.key]}
              onChange={handleAnswerChange}
              error={error}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentQuestion.type !== 'single_choice' && (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface QuestionRendererProps {
  question: FormSnapshot['questions'][0]
  value: AnswerValue
  onChange: (value: AnswerValue) => void
  error: string | null
}

function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const config = question.configJson as QuestionConfig | null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h2>
      </div>

      {question.type === 'short_text' && (
        <Input
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config?.placeholder || 'Type your answer...'}
          className="text-lg py-6"
        />
      )}

      {question.type === 'long_text' && (
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config?.placeholder || 'Type your answer...'}
          rows={4}
          className="text-lg"
        />
      )}

      {question.type === 'email' && (
        <Input
          type="email"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config?.placeholder || 'email@example.com'}
          className="text-lg py-6"
        />
      )}

      {question.type === 'phone' && (
        <Input
          type="tel"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config?.placeholder || '+1 (555) 000-0000'}
          className="text-lg py-6"
        />
      )}

      {question.type === 'single_choice' && config?.choices && (
        <RadioGroup
          value={(value as string) || ''}
          onValueChange={onChange}
          className="space-y-3"
        >
          {config.choices.map((choice) => (
            <label
              key={choice.id}
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                value === choice.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <RadioGroupItem value={choice.id} />
              <span className="text-lg">{choice.label}</span>
            </label>
          ))}
        </RadioGroup>
      )}

      {question.type === 'multiple_choice' && config?.choices && (
        <div className="space-y-3">
          {config.choices.map((choice) => {
            const selected = Array.isArray(value) && value.includes(choice.id)
            return (
              <label
                key={choice.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                  selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(value) ? value : []
                    if (checked) {
                      onChange([...current, choice.id])
                    } else {
                      onChange(current.filter((id) => id !== choice.id))
                    }
                  }}
                />
                <span className="text-lg">{choice.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {question.type === 'consent' && (
        <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 cursor-pointer">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            className="mt-1"
          />
          <span className="text-base text-slate-700">
            {config?.consentText || 'I agree to the terms and conditions'}
          </span>
        </label>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  )
}

