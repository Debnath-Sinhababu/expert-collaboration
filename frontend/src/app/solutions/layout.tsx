import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Services & Solutions | Calxmap',
  description: 'Explore Calxmap\'s comprehensive services for experts, students, and institutions. Connect with verified professionals, find internships and freelance opportunities, access training programs, and build your professional network.',
  keywords: [
    'Calxmap services',
    'expert services',
    'student opportunities',
    'institution solutions',
    'expert networking',
    'internships',
    'freelance projects',
    'training programs',
    'professional networking',
    'expert consultation',
    'guest lectures',
    'workshops',
    'mentorship',
  ],
  openGraph: {
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/solutions`,
    title: 'Services & Solutions | Calxmap',
    description: 'Explore Calxmap\'s comprehensive services for experts, students, and institutions. Connect with verified professionals, find internships and freelance opportunities, access training programs, and build your professional network.',
    siteName: 'Calxmap',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Services & Solutions | Calxmap',
    description: 'Explore Calxmap\'s comprehensive services for experts, students, and institutions. Connect with verified professionals, find internships and freelance opportunities, access training programs, and build your professional network.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/solutions`,
  },
}

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

