import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import JsonLd from '@/components/JsonLd'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getProjectData(projectId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, description, type, hourly_rate, institution_id, required_expertise, updated_at, status')
      .eq('id', projectId)
      .single()

    if (error || !data) return null
    // Only return if open
    if (data.status !== 'open') return null
    
    // Fetch institution info separately if needed
    let institutions: { name?: string; city?: string; state?: string } | null = null
    if (data.institution_id) {
      const { data: instData } = await supabase
        .from('institutions')
        .select('name, city, state')
        .eq('id', data.institution_id)
        .single()
      institutions = instData || null
    }
    
    return { ...data, institutions }
  } catch (error) {
    console.error('Error fetching project for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = await getProjectData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  if (!project) {
    return {
      title: 'Project Not Found | Calxmap',
      description: 'The project you are looking for does not exist or is no longer available.',
    }
  }

  const title = project.title || 'Expert Project Opportunity'
  const description = project.description || `Join ${project.institutions?.name || 'our team'} for an exciting ${project.type || 'project'} opportunity.`
  const location = [project.institutions?.city, project.institutions?.state].filter(Boolean).join(', ') || 'India'
  const expertise = Array.isArray(project.required_expertise) ? project.required_expertise.join(', ') : ''
  const projectType = project.type || 'project'

  return {
    title: `${title} - ${projectType} Opportunity | Calxmap`,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords: [
      title,
      projectType,
      'expert opportunity',
      'consulting',
      location,
      expertise,
      'Calxmap',
    ].filter(Boolean),
    openGraph: {
      type: 'article',
      url: `${siteUrl}/requirements/contract/${params.id}`,
      title: `${title} - ${projectType} Opportunity`,
      description: description,
      siteName: 'Calxmap',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - ${projectType} Opportunity`,
      description: description,
    },
    alternates: {
      canonical: `${siteUrl}/requirements/contract/${params.id}`,
    },
  }
}

export default async function ContractLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const project = await getProjectData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  // Generate JobPosting schema for SEO
  const jobPostingSchema = project ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": project.title || "Expert Project Opportunity",
    "description": project.description || "",
    "hiringOrganization": {
      "@type": "Organization",
      "name": project.institutions?.name || "Institution"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": project.institutions?.city || project.institutions?.state || "India"
      }
    },
    "datePosted": project.updated_at || new Date().toISOString(),
    "validThrough": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    "employmentType": "CONTRACTOR",
    ...(project.hourly_rate && {
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": {
          "@type": "QuantitativeValue",
          "value": project.hourly_rate,
          "unitText": "HOUR"
        }
      }
    }),
    ...(Array.isArray(project.required_expertise) && project.required_expertise.length > 0 && {
      "skills": project.required_expertise.join(", ")
    })
  } : null

  return (
    <>
      {jobPostingSchema && <JsonLd data={jobPostingSchema} />}
      {children}
    </>
  )
}

