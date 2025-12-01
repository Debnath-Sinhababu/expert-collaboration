import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Student Dashboard',
  description: 'Find internships, connect with experts, and explore opportunities at leading universities and companies. Your gateway to professional growth on Calxmap.',
  keywords: [
    'student internships',
    'student opportunities',
    'expert mentorship',
    'university programs',
    'career development',
    'Calxmap student',
  ],
  openGraph: {
    title: 'Student Dashboard | Calxmap',
    description: 'Find internships and connect with experts',
    url: 'https://www.calxmap.in/student',
    siteName: 'Calxmap',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Student Dashboard | Calxmap',
    description: 'Find internships and connect with experts',
  },
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
