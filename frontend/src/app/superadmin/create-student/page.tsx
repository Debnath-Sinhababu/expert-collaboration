import { redirect } from 'next/navigation'

export default function SuperAdminCreateStudentPage() {
  redirect('/superadmin/create-profiles?type=student')
}
