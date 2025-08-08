import { useState, useEffect, useCallback, useRef } from 'react'

export function usePagination<T>(
  fetchFunction: (page: number) => Promise<T[]>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const newData = await fetchFunction(currentPage)
      
      if (newData.length === 0) {
        setHasMore(false)
      } else {
        setData(prev => [...prev, ...newData])
        setCurrentPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error loading more data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFunction, currentPage, loading, hasMore])

  const refresh = useCallback(async () => {
    setData([])
    setCurrentPage(1)
    setHasMore(true)
    setLoading(true)
    
    try {
      const newData = await fetchFunction(1)
      setData(newData)
      setCurrentPage(2)
      setHasMore(newData.length > 0)
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFunction])

  useEffect(() => {
    refresh()
  }, dependencies)

  return {
    data,
    loading,
    hasMore,
    loadMore,
    refresh
  }
}
