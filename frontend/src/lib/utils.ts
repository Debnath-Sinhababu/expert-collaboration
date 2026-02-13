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
