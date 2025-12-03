import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import JsonLd from '@/components/JsonLd'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getInternshipData(internshipId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('internships')
      .select('id, title, responsibilities, location, corporate_institution_id, skills_required, updated_at, visibility_scope, status')
      .eq('id', internshipId)
      .single()


    if (error || !data) return null
    // Only return if public and open
    if (data.visibility_scope !== 'public' || data.status !== 'open') return null
    
    // Fetch corporate info separately if needed
    let corporate: { name?: string; state?: string } | null = null
    if (data.corporate_institution_id) {
      const { data: corpData } = await supabase
        .from('institutions')
        .select('name, state')
        .eq('id', data.corporate_institution_id)
        .single()
      corporate = corpData || null
    }
    
    return { ...data, corporate }
  } catch (error) {
    console.error('Error fetching internship for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const internship = await getInternshipData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  if (!internship) {
    return {
      title: 'Internship Not Found | Calxmap',
      description: 'The internship you are looking for does not exist or is no longer available.',
    }
  }

  const title = internship.title || 'Internship Opportunity'
  const description = internship.responsibilities || `Join ${internship.corporate?.name || 'our team'} for an exciting internship opportunity.`
  const location = [internship.location, internship.corporate?.state].filter(Boolean).join(', ') || 'India'
  const skills = Array.isArray(internship.skills_required) ? internship.skills_required.join(', ') : ''

  return {
    title: `${title} - Internship Opportunity | Calxmap`,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords: [
      title,
      'internship',
      location,
      skills,
      'student opportunity',
      'Calxmap',
    ].filter(Boolean),
    openGraph: {
      type: 'article',
      url: `${siteUrl}/requirements/internship/${params.id}`,
      title: `${title} - Internship Opportunity`,
      description: description,
      siteName: 'Calxmap',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Internship Opportunity`,
      description: description,
    },
    alternates: {
      canonical: `${siteUrl}/requirements/internship/${params.id}`,
    },
  }
}

export default async function InternshipLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const internship = await getInternshipData(params.id)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  // Generate JobPosting schema for SEO
  const jobPostingSchema = internship ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": internship.title || "Internship Opportunity",
    "description": internship.responsibilities || "",
    "hiringOrganization": {
      "@type": "Organization",
      "name": internship.corporate?.name || "Company"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": internship.location || internship.corporate?.state || "India"
      }
    },
    "datePosted": internship.updated_at || new Date().toISOString(),
    "validThrough": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    "employmentType": "INTERN",
    ...(Array.isArray(internship.skills_required) && internship.skills_required.length > 0 && {
      "skills": internship.skills_required.join(", ")
    })
  } : null

  return (
    <>
      {jobPostingSchema && <JsonLd data={jobPostingSchema} />}
      {children}
    </>
  )
}

