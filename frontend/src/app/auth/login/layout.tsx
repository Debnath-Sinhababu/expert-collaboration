import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login | Calxmap',
  description: 'Sign in to your Calxmap account to access expert networking, student opportunities, and institutional collaboration features.',
  keywords: [
    'login',
    'sign in',
    'Calxmap',
    'expert login',
    'student login',
    'institution login',
    'account access',
  ],
  openGraph: {
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/auth/login`,
    title: 'Login | Calxmap',
    description: 'Sign in to your Calxmap account to access expert networking, student opportunities, and institutional collaboration features.',
    siteName: 'Calxmap',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Calxmap',
    description: 'Sign in to your Calxmap account to access expert networking, student opportunities, and institutional collaboration features.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/auth/login`,
  },
  robots: {
    index: false, // Login pages typically shouldn't be indexed
    follow: true,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

