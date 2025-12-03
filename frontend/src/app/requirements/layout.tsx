import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Current Requirements | Calxmap',
  description: 'Browse current job opportunities on Calxmap. Find contract projects for experts, internships for students, and freelance projects. Explore open positions and apply today.',
  keywords: [
    'job opportunities',
    'contract projects',
    'internships',
    'freelance projects',
    'expert opportunities',
    'student opportunities',
    'Calxmap requirements',
    'open positions',
    'apply now',
  ],
  openGraph: {
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/requirements`,
    title: 'Current Requirements | Calxmap',
    description: 'Browse current job opportunities on Calxmap. Find contract projects for experts, internships for students, and freelance projects. Explore open positions and apply today.',
    siteName: 'Calxmap',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Current Requirements | Calxmap',
    description: 'Browse current job opportunities on Calxmap. Find contract projects for experts, internships for students, and freelance projects. Explore open positions and apply today.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/requirements`,
  },
}

export default function RequirementsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

