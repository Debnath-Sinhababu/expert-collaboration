import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Authentication',
    template: '%s | Calxmap',
  },
  description: 'Sign in or create an account to access Calxmap - the world\'s first expert networking platform.',
  keywords: ['login', 'signup', 'register', 'authentication', 'Calxmap account'],
  openGraph: {
    title: 'Sign In | Calxmap',
    description: 'Access your Calxmap account',
    url: 'https://www.calxmap.in/auth',
    siteName: 'Calxmap',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In | Calxmap',
    description: 'Access your Calxmap account',
  },
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
