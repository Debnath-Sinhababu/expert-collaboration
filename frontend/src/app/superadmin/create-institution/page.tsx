import { redirect } from 'next/navigation'

export default function SuperAdminCreateInstitutionPage() {
  redirect('/superadmin/create-profiles?type=institution')
}
