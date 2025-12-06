import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Institution Dashboard',
  description: 'Connect with verified experts, post opportunities, and manage collaborations. Enhance your institution\'s academic programs with industry professionals on Calxmap.',
  keywords: [
    'institution dashboard',
    'expert collaboration',
    'guest faculty',
    'workshops',
    'FDP programs',
    'university partnerships',
    'Calxmap institution',
  ],
  openGraph: {
    title: 'Institution Dashboard | Calxmap',
    description: 'Connect with experts and manage collaborations',
    url: 'https://www.calxmap.in/institution',
    siteName: 'Calxmap',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Institution Dashboard | Calxmap',
    description: 'Connect with experts and manage collaborations',
  },
}

export default function InstitutionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
