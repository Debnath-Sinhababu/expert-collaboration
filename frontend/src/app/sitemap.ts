import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calxmap.in'

  const routes = ['', '/auth/login', '/auth/signup', '/expert/dashboard', '/institution/dashboard', '/student-feedback', '/student-feedback/form', '/admin/feedback-analytics']

  const now = new Date().toISOString()

  return routes.map((route) => ({
    url: `${siteUrl}${route || '/'}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : 0.7,
  }))
}
