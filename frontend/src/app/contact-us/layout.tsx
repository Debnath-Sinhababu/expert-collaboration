import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Calxmap. We\'re here to help you connect with experts, find opportunities, and grow your professional network.',
  keywords: ['contact Calxmap', 'support', 'help', 'customer service'],
  openGraph: {
    title: 'Contact Us | Calxmap',
    description: 'Get in touch with Calxmap',
    url: 'https://www.calxmap.in/contact-us',
    siteName: 'Calxmap',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Us | Calxmap',
    description: 'Get in touch with Calxmap',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
