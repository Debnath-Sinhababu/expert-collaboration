'use client'

// Wrapper that reuses the existing CreateInternshipPage logic without altering it.
// We import the component and render it within the unified tabs page.

import CreateInternshipPage from '@/app/institution/internships/create/page'

export default function InternshipForm() {
  return <CreateInternshipPage />
}


