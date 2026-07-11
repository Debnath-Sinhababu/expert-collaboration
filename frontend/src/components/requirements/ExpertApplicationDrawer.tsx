'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { moneyInr, projectCompensationDisplay, type ProjectCompensationLike } from '@/lib/projectCompensation'

export type ExpertApplyProject = ProjectCompensationLike & {
  id: string
  title?: string | null
  interview_period_interval?: string | null
  screening_questions?: string[] | null
}

export type ExpertApplicationFormState = {
  coverLetter: string
  rateIntent: 'agreed_posted' | 'open_to_negotiate'
  rateNote: string
  interviewAvailability: any[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ExpertApplyProject | null
  form: ExpertApplicationFormState
  onFormChange: (next: ExpertApplicationFormState) => void
  isApplying?: boolean
  error?: string
  success?: string
  onSubmit: (payload: {
    cover_letter: string
    rate_intent: 'agreed_posted' | 'open_to_negotiate'
    rate_note: string | null
    interview_availability: any[]
    screening_answers: string | null
  }) => void | Promise<void>
}

function screeningList(project: ExpertApplyProject | null): string[] {
  if (!project || !Array.isArray(project.screening_questions)) return []
  return project.screening_questions.map((q) => String(q || '').trim()).filter(Boolean)
}

export function ExpertApplicationDrawer({
  open,
  onOpenChange,
  project,
  form,
  onFormChange,
  isApplying = false,
  error = '',
  success = '',
  onSubmit,
}: Props) {
  const questions = useMemo(() => screeningList(project), [project])
  const pricing = useMemo(
    () => (project ? projectCompensationDisplay(project) : null),
    [project]
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setAnswers(questions.map(() => ''))
  }, [open, project?.id, questions.length])

  const hasQuestions = questions.length > 0
  const onQuestionStep = hasQuestions && stepIndex < questions.length
  const totalSteps = hasQuestions ? questions.length + 1 : 1
  const currentStepLabel = hasQuestions ? Math.min(stepIndex + 1, totalSteps) : 1

  async function handleSubmit() {
    if (!form.coverLetter.trim()) return
    if (!form.rateIntent) return

    let screeningCombined: string | null = null
    if (hasQuestions) {
      screeningCombined = questions
        .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || ''}`)
        .join('\n\n')
    }

    await onSubmit({
      cover_letter: form.coverLetter.trim(),
      rate_intent: form.rateIntent,
      rate_note: form.rateNote.trim() || null,
      interview_availability: form.interviewAvailability || [],
      screening_answers: screeningCombined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-4 pr-12">
          <SheetTitle>
            {hasQuestions && onQuestionStep ? 'Screening questions' : 'Apply to project'}
          </SheetTitle>
          <SheetDescription>
            {hasQuestions && onQuestionStep
              ? `Answer question ${stepIndex + 1} of ${questions.length}`
              : `Submit your application${project?.title ? ` for ${project.title}` : ''}`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-4">
            {onQuestionStep ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Question {stepIndex + 1} of {questions.length}
                </p>
                <p className="font-medium text-slate-900">{questions[stepIndex]}</p>
                <Textarea
                  placeholder="Type your answer"
                  value={answers[stepIndex] || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setAnswers((prev) => prev.map((a, i) => (i === stepIndex ? val : a)))
                  }}
                  rows={5}
                  className="border-2 border-slate-200 focus-visible:border-[#008260] focus-visible:ring-1 focus-visible:ring-[#008260] focus-visible:ring-offset-0"
                />
              </div>
            ) : (
              <div className="space-y-5">
                {project && pricing ? (
                  <div className="space-y-1 rounded-lg border border-[#DCDCDC] bg-[#F8FBFA] p-3 text-sm">
                    <div className="font-semibold text-[#000000]">{project.title}</div>
                    <div className="text-[#6A6A6A]">Posted compensation</div>
                    <div className="font-semibold text-[#008260]">
                      You earn ~{moneyInr(pricing.netPerUnitDisplay)} / {pricing.unitShort}
                      {pricing.quantity > 1 ? ` · ${pricing.quantity} ${pricing.unitShort}s` : ''}
                    </div>
                    <div className="text-[#6A6A6A]">
                      ~{moneyInr(pricing.expertNetTotal)} total
                      {pricing.expectedTotalHours > 0 ? ` · ${pricing.expectedTotalHours} hours` : ''}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="expertApplyCoverLetter" className="text-sm font-medium text-slate-700">
                    Cover letter *
                  </Label>
                  <Textarea
                    id="expertApplyCoverLetter"
                    placeholder="Explain why you're the perfect fit for this project..."
                    value={form.coverLetter}
                    onChange={(e) => onFormChange({ ...form, coverLetter: e.target.value })}
                    rows={4}
                    className="border-2 border-slate-200 focus-visible:border-[#008260] focus-visible:ring-1 focus-visible:ring-[#008260] focus-visible:ring-offset-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Rate preference *</Label>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#DCDCDC] p-3 text-sm">
                      <input
                        type="radio"
                        name="expertApplyRateIntent"
                        className="mt-1"
                        checked={form.rateIntent === 'agreed_posted'}
                        onChange={() => onFormChange({ ...form, rateIntent: 'agreed_posted' })}
                      />
                      <span>
                        <span className="block font-medium text-[#000000]">I agree to the posted rate</span>
                        <span className="text-[#6A6A6A]">
                          Proceed at ~{moneyInr(pricing?.netPerUnitDisplay || 0)} / {pricing?.unitShort || 'unit'} earn
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#DCDCDC] p-3 text-sm">
                      <input
                        type="radio"
                        name="expertApplyRateIntent"
                        className="mt-1"
                        checked={form.rateIntent === 'open_to_negotiate'}
                        onChange={() => onFormChange({ ...form, rateIntent: 'open_to_negotiate' })}
                      />
                      <span>
                        <span className="block font-medium text-[#000000]">I&apos;m open to negotiate if shortlisted</span>
                        <span className="text-[#6A6A6A]">No amount now — discuss after interview</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertApplyRateNote" className="text-sm font-medium text-slate-700">
                    Optional note (no amounts)
                  </Label>
                  <Input
                    id="expertApplyRateNote"
                    placeholder="e.g. Travel from another city"
                    value={form.rateNote}
                    onChange={(e) => onFormChange({ ...form, rateNote: e.target.value })}
                    className="border-2 border-slate-200 focus-visible:border-[#008260] focus-visible:ring-1 focus-visible:ring-[#008260] focus-visible:ring-offset-0"
                  />
                </div>

                {project?.interview_period_interval ? (
                  <div className="rounded-lg border border-[#DCDCDC] bg-[#F8FBFA] p-3 text-sm">
                    <span className="block font-medium text-[#000000]">Interview period</span>
                    <span className="text-[#6A6A6A]">{project.interview_period_interval}</span>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <Alert variant="destructive" className="border-2 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert className="border-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              {hasQuestions ? (
                <span>
                  Step {currentStepLabel} of {totalSteps}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onQuestionStep && stepIndex > 0) setStepIndex(stepIndex - 1)
                  else if (!onQuestionStep && hasQuestions) setStepIndex(questions.length - 1)
                  else onOpenChange(false)
                }}
                className="w-24 rounded-lg bg-[#D6D6D6] hover:bg-[#D6D6D6]"
              >
                Back
              </Button>
              {onQuestionStep ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (!(answers[stepIndex] || '').trim()) return
                    setStepIndex(stepIndex + 1)
                  }}
                  disabled={!((answers[stepIndex] || '').trim())}
                  className="w-24 bg-[#008260] text-white hover:bg-[#006B4F]"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!form.coverLetter.trim() || !form.rateIntent || isApplying}
                  className="bg-[#008260] text-white hover:bg-[#006B4F]"
                >
                  {isApplying ? 'Submitting...' : 'Submit application'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
