import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | Calxmap',
  description: 'Join Calxmap - the world\'s first knowledge sharing networking platform. Create your account as an Expert, Student, or Institution and start connecting with opportunities.',
  keywords: [
    'sign up',
    'register',
    'create account',
    'Calxmap',
    'expert signup',
    'student signup',
    'institution signup',
    'join Calxmap',
  ],
  openGraph: {
    type: 'website',
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/auth/signup`,
    title: 'Sign Up | Calxmap',
    description: 'Join Calxmap - the world\'s first knowledge sharing networking platform. Create your account as an Expert, Student, or Institution and start connecting with opportunities.',
    siteName: 'Calxmap',
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up | Calxmap',
    description: 'Join Calxmap - the world\'s first knowledge sharing networking platform. Create your account as an Expert, Student, or Institution and start connecting with opportunities.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.calxmap.in'}/auth/signup`,
  },
  robots: {
    index: false, // Signup pages typically shouldn't be indexed
    follow: true,
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

