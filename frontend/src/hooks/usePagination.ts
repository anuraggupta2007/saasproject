import { useCallback, useMemo, useState } from 'react'

export function usePagination(total: number, perPage: number) {
  const [page, setPage] = useState(1)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage])

  const next = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages])
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, 1)), [])
  const goTo = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  )

  return { page, totalPages, next, prev, goTo, setPage } as const
}
