import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import JsonLd from '@/components/JsonLd'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getFreelanceProjectData(projectId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('freelance_projects')
      .select('id, title, description, corporate_institution_id, required_skills, budget_min, budget_max, deadline, updated_at, status')
      .eq('id', projectId)
      .single()

    if (error || !data) return null
    // Only return if open
    if (data.status !== 'open') return null
    
    // Fetch corporate info separately if needed
    let corporate: { name?: string; city?: string; state?: string } | null = null
    if (data.corporate_institution_id) {
      const { data: corpData } = await supabase
        .from('institutions')
        .select('name, city, state')
        .eq('id', data.corporate_institution_id)
        .single()
      corporate = corpData || null
    }
    
    return { ...data, corporate }
  } catch (error) {
    console.error('Error fetching freelance project for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = await getFreelanceProjectData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  if (!project) {
    return {
      title: 'Freelance Project Not Found | Calxmap',
      description: 'The freelance project you are looking for does not exist or is no longer available.',
    }
  }

  const title = project.title || 'Freelance Project'
  const description = project.description || `Join ${project.corporate?.name || 'our team'} for an exciting freelance opportunity.`
  const location = [project.corporate?.city, project.corporate?.state].filter(Boolean).join(', ') || 'India'
  const skills = Array.isArray(project.required_skills) ? project.required_skills.join(', ') : ''
  const budget = project.budget_min && project.budget_max 
    ? `₹${project.budget_min} - ₹${project.budget_max}` 
    : project.budget_min 
    ? `₹${project.budget_min}+` 
    : ''

  return {
    title: `${title} - Freelance Project | Calxmap`,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords: [
      title,
      'freelance',
      'freelance project',
      location,
      skills,
      'student opportunity',
      'Calxmap',
    ].filter(Boolean),
    openGraph: {
      type: 'article',
      url: `${siteUrl}/requirements/freelance/${params.id}`,
      title: `${title} - Freelance Project`,
      description: description,
      siteName: 'Calxmap',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Freelance Project`,
      description: description,
    },
    alternates: {
      canonical: `${siteUrl}/requirements/freelance/${params.id}`,
    },
  }
}

export default async function FreelanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const project = await getFreelanceProjectData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  // Generate JobPosting schema for SEO
  const jobPostingSchema = project ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": project.title || "Freelance Project",
    "description": project.description || "",
    "hiringOrganization": {
      "@type": "Organization",
      "name": project.corporate?.name || "Company"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": project.corporate?.city || project.corporate?.state || "India"
      }
    },
    "datePosted": project.updated_at || new Date().toISOString(),
    "validThrough": project.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    "employmentType": "CONTRACTOR",
    ...(project.budget_min && {
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": project.budget_min,
          "maxValue": project.budget_max || project.budget_min
        }
      }
    }),
    ...(Array.isArray(project.required_skills) && project.required_skills.length > 0 && {
      "skills": project.required_skills.join(", ")
    })
  } : null

  return (
    <>
      {jobPostingSchema && <JsonLd data={jobPostingSchema} />}
      {children}
    </>
  )
}

