import { Metadata } from 'next'
import { ExpertWorkspaceShell } from '@/components/expert/ExpertWorkspaceShell'

export const metadata: Metadata = {
  title: 'Expert Dashboard',
  description: 'Manage your expert profile, view opportunities, and track your applications on Calxmap. Connect with leading institutions and grow your professional network.',
  keywords: [
    'expert dashboard',
    'professional opportunities',
    'guest lectures',
    'workshops',
    'consulting projects',
    'expert networking',
    'Calxmap expert',
  ],
  openGraph: {
    title: 'Expert Dashboard | Calxmap',
    description: 'Manage your expert profile and discover new opportunities',
    url: 'https://www.calxmap.in/expert',
    siteName: 'Calxmap',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Expert Dashboard | Calxmap',
    description: 'Manage your expert profile and discover new opportunities',
  },
}

export default function ExpertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ExpertWorkspaceShell>{children}</ExpertWorkspaceShell>
}
