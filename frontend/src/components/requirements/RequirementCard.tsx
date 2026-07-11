import Link from 'next/link'
import { Calendar, Clock, Eye, Send, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShareRequirementButton } from '@/components/requirements/ShareRequirementButton'
import { PricingSummary } from './PricingSummary'

type Project = {
  id: string
  title?: string
  description?: string
  type?: string
  hourly_rate?: number
  total_budget?: number
  duration_hours?: number
  start_date?: string
  end_date?: string
  opening_count?: number
  max_applications?: number
  interview_period_interval?: string | null
  required_expertise?: string[]
  subskills?: string[]
  institutions?: { name?: string; city?: string; state?: string }
}

type Props = {
  project: Project
  detailHref: string
  onApply?: (project: Project) => void
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function typeLabel(type?: string) {
  return type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Requirement'
}

export function RequirementCard({ project, detailHref, onApply }: Props) {
  const skills = [...(project.subskills || []), ...(project.required_expertise || [])].slice(0, 5)
  return (
    <Card className="bg-white border border-[#DCDCDC] rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-[#E8F5F1] text-[#008260] border border-[#BFE3D8]">
                {typeLabel(project.type)}
              </Badge>
              <span className="text-xs text-[#717171]">{project.institutions?.name || 'Institute'}</span>
            </div>
            <Link href={detailHref}>
              <h3 className="text-lg font-semibold text-[#000000] hover:text-[#008260] truncate">
                {project.title || 'Untitled requirement'}
              </h3>
            </Link>
            <p className="text-sm text-[#6A6A6A] line-clamp-2 mt-1">{project.description || 'No description provided.'}</p>
            <div className="grid sm:grid-cols-3 gap-2 mt-4 text-xs text-[#4B5563]">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Start {formatDate(project.start_date)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Approx end {formatDate(project.end_date)}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Openings {project.opening_count || project.max_applications || 1}</span>
            </div>
            {project.interview_period_interval && (
              <p className="mt-2 flex items-center gap-1 text-xs text-[#4B5563]">
                <Clock className="h-3.5 w-3.5" />
                Interview period: <span className="font-medium">{project.interview_period_interval}</span>
              </p>
            )}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-[#F4F6F8] text-[#374151] border border-[#E5E7EB]">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="w-full lg:w-72 space-y-3">
            <PricingSummary
              project={project}
              hourlyRate={project.hourly_rate}
              totalBudget={project.total_budget}
              durationHours={project.duration_hours}
              audience="expert"
              compact
            />
            <div className="flex gap-2">
              {onApply && (
                <Button onClick={() => onApply(project)} className="flex-1 bg-[#008260] hover:bg-[#006B4F] text-white">
                  <Send className="h-4 w-4 mr-1" />
                  Apply
                </Button>
              )}
              <Link href={detailHref}>
                <Button variant="outline" size="icon" className="border-[#008260] text-[#008260]">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <ShareRequirementButton
                path={`/requirements/contract/${project.id}`}
                title={project.title || 'Project requirement'}
                className="border-[#008260] text-[#008260] shrink-0"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
