export type AvailabilityRankExpert = {
  id?: string
  open_to_work?: boolean
  available_today?: boolean
  rating?: number
  total_ratings?: number
}

export function sortExpertsByAvailability<T extends AvailabilityRankExpert>(experts: T[]) {
  return [...experts].sort((a, b) => {
    const rank = (expert: T) => {
      if (expert.open_to_work && expert.available_today) return 0
      if (expert.open_to_work) return 1
      return 2
    }
    const availabilityDiff = rank(a) - rank(b)
    if (availabilityDiff !== 0) return availabilityDiff
    return Number(b.rating || 0) - Number(a.rating || 0)
  })
}
