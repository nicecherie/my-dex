'use client'

import { useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export function NetworkChecker({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // 如果客户端未挂载，返回子组件
  if (!mounted) {
    return <>{children}</>
  }
  // 如果未连接钱包，显示子组件
  if (!isConnected) {
    return <>{children}</>
  }
  // 如果已连接，但是网络不是 sepolia 网络，处理逻辑
  if (chainId !== sepolia.id) {
    return (
      <div className="mb-6">
               {' '}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                   {' '}
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>         {' '}
          </div>
                   {' '}
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        网络不匹配          {' '}
          </h3>
                   {' '}
          <p className="text-yellow-700 mb-4">
                        请切换到 Sepolia 测试网络以使用此应用          {' '}
          </p>
                   {' '}
          <button
            onClick={() => switchChain?.({ chainId: sepolia.id })}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
                        切换到 Sepolia          {' '}
          </button>
                   {' '}
          <div className="mt-4 text-sm text-yellow-600">
                        <p>当前网络: {chainId}</p>           {' '}
            <p>需要网络: Sepolia ({sepolia.id})</p>         {' '}
          </div>
                 {' '}
        </div>
                {children}     {' '}
      </div>
    )
  }

  return <>{children}</>
}
