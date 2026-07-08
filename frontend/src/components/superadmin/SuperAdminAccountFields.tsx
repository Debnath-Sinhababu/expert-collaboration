'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Matches backend `profileAuthService` default when field is left empty. */
export const SUPERADMIN_DEFAULT_PASSWORD_HINT = 'ExpertCollaboration@123'

export function validateSuperAdminPassword(
  password: string,
  confirmPassword: string,
): string | null {
  const pwd = password.trim()
  const conf = confirmPassword.trim()
  if (!pwd && !conf) return null
  if (pwd && !conf) return 'Please confirm the login password'
  if (!pwd && conf) return 'Enter a login password to confirm'
  if (pwd.length < 8) return 'Login password must be at least 8 characters'
  if (pwd !== conf) return 'Password and confirmation do not match'
  return null
}

type SuperAdminAccountFieldsProps = {
  initialPassword: string
  confirmPassword: string
  onInitialPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  className?: string
}

export function SuperAdminAccountFields({
  initialPassword,
  confirmPassword,
  onInitialPasswordChange,
  onConfirmPasswordChange,
  className,
}: SuperAdminAccountFieldsProps) {
  return (
    <div
      className={
        className ||
        'rounded-lg border border-[#008260]/25 bg-[#E8F5F1]/50 p-4 space-y-4 md:col-span-2'
      }
    >
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Login account</h4>
        <p className="text-xs text-slate-600 mt-1">
          A Supabase login is created for the email above. Leave blank to use the default password:{' '}
          <span className="font-mono text-slate-800">{SUPERADMIN_DEFAULT_PASSWORD_HINT}</span>
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="superadmin_initial_password">Login password (optional)</Label>
          <Input
            id="superadmin_initial_password"
            type="password"
            autoComplete="new-password"
            placeholder={`Default: ${SUPERADMIN_DEFAULT_PASSWORD_HINT}`}
            value={initialPassword}
            onChange={(e) => onInitialPasswordChange(e.target.value)}
            className="border-slate-200 focus:border-[#008260] focus:ring-[#008260]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="superadmin_confirm_password">Confirm password</Label>
          <Input
            id="superadmin_confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter if setting a custom password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            className="border-slate-200 focus:border-[#008260] focus:ring-[#008260]"
          />
        </div>
      </div>
    </div>
  )
}
