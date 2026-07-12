import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Institution-facing rate from an expert's profile/asking rate.
 * Expert profile rate = what they want to earn (NET).
 * Institution sees GROSS: net / 0.70 (platform keeps 30% of gross).
 */
export function getInstitutionRate(originalRate: number | null | undefined): number {
  if (!originalRate || originalRate <= 0) return 0
  return Math.round(Number(originalRate) / 0.7)
}

export function isCommonEmailProvider(email: string): boolean {
  const commonDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'live.com',
    'msn.com',
    'protonmail.com',
    'gmx.com',
    'zoho.com',
    'mail.com',
    'yandex.com'
  ]
  const normalizedEmail = email?.trim().toLowerCase() || ''
  if (!normalizedEmail || !normalizedEmail.includes('@')) return false
  const domain = normalizedEmail.split('@').pop() || ''
  return commonDomains.some(common => domain === common || domain.endsWith(`.${common}`))
}
