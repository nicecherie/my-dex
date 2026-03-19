import React, { Suspense } from 'react'
import LiquidityManager from '@/components/pools/LiquidityManager'
export default function LiquidityPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8 text-center">添加流动性</h1>
      <div className="flex justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <LiquidityManager />
        </Suspense>
      </div>
    </div>
  )
}
