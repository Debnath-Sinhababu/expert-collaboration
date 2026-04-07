import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the marked-up rate for institutions (30% markup)
 * @param originalRate - The original expert hourly rate
 * @returns The rate with 30% markup (rounded to nearest integer)
 */
export function getInstitutionRate(originalRate: number | null | undefined): number {
  if (!originalRate || originalRate <= 0) return 0
  return Math.round(originalRate * 1.30)
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
