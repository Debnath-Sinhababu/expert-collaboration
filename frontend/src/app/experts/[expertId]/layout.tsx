import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import JsonLd from '@/components/JsonLd'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getExpertData(expertId: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('experts')
      .select('id, name, bio, domain_expertise, photo_url, hourly_rate, experience_years, is_verified, updated_at')
      .eq('id', expertId)
      .single()

    if (error || !data) return null
    return data
  } catch (error) {
    console.error('Error fetching expert for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { expertId: string } }): Promise<Metadata> {
  const expert = await getExpertData(params.expertId)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  if (!expert) {
    return {
      title: 'Expert Not Found | Calxmap',
      description: 'Expert profile not found on Calxmap',
    }
  }

  const expertName = expert.name || 'Expert'
  const domain = Array.isArray(expert.domain_expertise) && expert.domain_expertise.length > 0 
    ? expert.domain_expertise[0] 
    : 'Professional'
  const bio = expert.bio || `Expert in ${domain} on Calxmap platform`
  const imageUrl = expert.photo_url || `${siteUrl}/images/logo.png`

  return {
    title: `${expertName} - ${domain} Expert | Calxmap`,
    description: bio.length > 160 ? bio.substring(0, 157) + '...' : bio,
    keywords: [
      expertName,
      domain,
      'expert',
      'consultant',
      'Calxmap',
      ...(Array.isArray(expert.domain_expertise) ? expert.domain_expertise : []),
    ],
    openGraph: {
      type: 'profile',
      url: `${siteUrl}/experts/${params.expertId}`,
      title: `${expertName} - ${domain} Expert`,
      description: bio,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${expertName} - Expert Profile`,
        },
      ],
      siteName: 'Calxmap',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${expertName} - ${domain} Expert`,
      description: bio,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${siteUrl}/experts/${params.expertId}`,
    },
  }
}

export default async function ExpertLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { expertId: string }
}) {
  const expert = await getExpertData(params.expertId)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'

  // Generate Person schema for SEO
  const personSchema = expert ? {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": expert.name || "Expert",
    "description": expert.bio || `Expert in ${Array.isArray(expert.domain_expertise) && expert.domain_expertise.length > 0 ? expert.domain_expertise[0] : 'Professional'}`,
    "image": expert.photo_url || `${siteUrl}/images/logo.png`,
    "jobTitle": Array.isArray(expert.domain_expertise) && expert.domain_expertise.length > 0 ? expert.domain_expertise[0] : "Expert",
    "url": `${siteUrl}/experts/${params.expertId}`,
    ...(expert.is_verified && {
      "identifier": {
        "@type": "PropertyValue",
        "name": "Verified Expert",
        "value": "true"
      }
    })
  } : null

  return (
    <>
      {personSchema && <JsonLd data={personSchema} />}
      {children}
    </>
  )
}

