import { useState, useEffect, useCallback, useRef } from 'react'

export const usePagination = (fetchFunction: any, pageSize = 10) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const observerRef = useRef<IntersectionObserver>()
  
  const lastElementRef = useCallback((node: any) => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore])
  
  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchFunction({ page, limit: pageSize })
      if (response.length < pageSize) setHasMore(false)
      setData(prev => page === 1 ? response : [...prev, ...response])
    } catch (error) {
      console.error('Pagination error:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFunction, page, pageSize])
  
  useEffect(() => {
    loadMore()
  }, [page])
  
  const refresh = useCallback(() => {
    setData([])
    setPage(1)
    setHasMore(true)
  }, [])
  
  return { data, loading, hasMore, lastElementRef, refresh }
}
