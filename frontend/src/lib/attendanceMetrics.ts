export function completionPercent(summary?: { percentOfHoursBooked?: number | null }) {
  const value = Number(summary?.percentOfHoursBooked ?? 0)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function earnedAmount(rate: unknown, summary?: { totalHoursApproved?: number | null }) {
  const hourlyRate = Number(rate || 0)
  const approvedHours = Number(summary?.totalHoursApproved || 0)
  if (!Number.isFinite(hourlyRate) || !Number.isFinite(approvedHours)) return 0
  return Math.round(hourlyRate * approvedHours)
}
