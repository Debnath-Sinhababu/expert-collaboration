import { redirect } from 'next/navigation'

export default function SuperAdminCreateExpertPage() {
  redirect('/superadmin/create-profiles?type=expert')
}
