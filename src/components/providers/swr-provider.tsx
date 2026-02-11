'use client'

import { SWRConfig } from 'swr'

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error('Fetch failed')
    return res.json()
  })

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  )
}
