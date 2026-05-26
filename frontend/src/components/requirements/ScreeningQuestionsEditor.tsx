'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

type Props = {
  questions: string[]
  onChange: (questions: string[]) => void
  maxQuestions?: number
}

export function ScreeningQuestionsEditor({ questions, onChange, maxQuestions = 10 }: Props) {
  const add = () => {
    if (questions.length >= maxQuestions) return
    onChange([...questions, ''])
  }

  const update = (index: number, value: string) => {
    const next = [...questions]
    next[index] = value
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[#000000] font-medium">Screening questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={questions.length >= maxQuestions}>
          <Plus className="h-4 w-4 mr-1" />
          Add question
        </Button>
      </div>
      <p className="text-xs text-[#6A6A6A]">
        Optional. Applicants will see these when applying (like LinkedIn job forms).
      </p>
      {questions.length === 0 ? (
        <p className="text-sm text-[#6A6A6A]">No screening questions yet.</p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-sm text-[#6A6A6A] pt-2 w-6 shrink-0">{i + 1}.</span>
              <Input
                value={q}
                placeholder="e.g. How many years of experience do you have in this domain?"
                onChange={(e) => update(i, e.target.value)}
                className="border-[#DCDCDC] flex-1"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove question">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
