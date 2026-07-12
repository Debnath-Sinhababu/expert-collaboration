'use client'

import { Badge } from '@/components/ui/badge'
import { formatEmploymentType, formatWorkplaceType } from '@/lib/requirementLabels'
import { institutionDisplayName } from '@/lib/privacyDisplay'
import { Building, Clock, MapPin } from 'lucide-react'

type ProjectLike = {
  type?: string
  job_location?: string | null
  workplace_type?: string | null
  employment_type?: string | null
  interview_period_interval?: string | null
  total_budget?: number | null
  screening_questions?: string[] | null
  institutions?: { name?: string; display_name?: string; city?: string; state?: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  guest_lecture: 'Guest Lecture',
  workshop: 'Workshop',
  consulting: 'Consulting',
  training: 'Training',
  mentorship: 'Mentorship',
  fdp: 'FDP',
  curriculum_dev: 'Curriculum Development',
  research_collaboration: 'Research Collaboration',
  training_program: 'Training Program',
  consultation: 'Consultation',
  other: 'Other',
}

export function ProjectRequirementMeta({ project }: { project: ProjectLike }) {
  const location =
    project.job_location?.trim() ||
    [project.institutions?.city, project.institutions?.state].filter(Boolean).join(', ')

  const questions = Array.isArray(project.screening_questions)
    ? project.screening_questions.filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      {project.institutions && (
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-[#008260] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#000000]">{institutionDisplayName(project.institutions)}</p>
            {(project.institutions.city || project.institutions.state) && (
              <p className="text-xs text-[#6A6A6A]">
                {[project.institutions.city, project.institutions.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
      {location && (
        <p className="flex items-center text-[#6A6A6A] text-sm">
          <MapPin className="h-4 w-4 mr-2 shrink-0" />
          <span>{location}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {project.type && (
          <Badge className="bg-[#FFF2E5] text-[#FF6B00] border-none">
            {TYPE_LABELS[project.type] || project.type}
          </Badge>
        )}
        {project.workplace_type && (
          <Badge variant="secondary">{formatWorkplaceType(project.workplace_type)}</Badge>
        )}
        {project.employment_type && (
          <Badge variant="secondary">{formatEmploymentType(project.employment_type)}</Badge>
        )}
      </div>
      {project.total_budget != null && (
        <p className="text-sm text-[#6A6A6A]">
          Total budget: <span className="font-semibold text-[#000000]">₹{project.total_budget}</span>
        </p>
      )}
      {project.interview_period_interval && (
        <div className="rounded-lg border border-[#BFE3D8] bg-[#E8F5F1] p-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#008260]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#008260]">Probable interview dates</p>
              <p className="mt-1 text-sm font-semibold text-[#000000]">{project.interview_period_interval}</p>
              <p className="mt-1 text-xs text-[#4B5563]">Institution shared this preferred interview window for the project.</p>
            </div>
          </div>
        </div>
      )}
      {questions.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-black mb-2">Screening questions</h3>
          <ol className="list-decimal list-inside text-sm text-[#6A6A6A] space-y-1">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
