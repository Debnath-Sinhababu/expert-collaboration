import { redirect } from 'next/navigation'

export default function SuperAdminHomeRedirectPage() {
  redirect('/superadmin/overview')
}
