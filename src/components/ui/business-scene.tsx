'use client'

import { Suspense, lazy } from 'react'

const Scene = lazy(() => import('@/components/three/BusinessScene'))

export function BusinessScene3D({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading scene…</span>
        </div>
      }
    >
      <Scene className={className} />
    </Suspense>
  )
}
