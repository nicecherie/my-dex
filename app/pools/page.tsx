'use client'

import { NetworkChecker } from '@/components/NetworkChecker'
import { CreatePoolModal } from '@/components/pools/CreatePoolModal'
import { usePools } from '@/hooks/usePools'
import { formatNumber } from '@/lib/utils'
import {
  Activity,
  Plus,
  Loader2,
  Droplets,
  DollarSign,
  Zap,
  TrendingUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from 'wagmi'

export default function PoolsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { isConnected } = useAccount()
  const { pools, loading, error, totalStats, refetch } = usePools()
  const router = useRouter()
  // 格式化最大数字
  const formatLargeNumber = (val: number) => {
    if (val >= 1000000) {
      return '$' + (val / 1000000).toFixed(2) + 'M'
    } else if (val >= 1000) {
      return '$' + (val / 1000).toFixed(2) + 'K'
    } else {
      return '$' + val.toFixed(2)
    }
  }

  const handleCreatePool = () => {
    router.push('/liquidity')
  }
  return (
    <div>
      <NetworkChecker>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">流动性池</h1>
          <p className="text-gray-600">
            查看所有流动性池的实时数据吗，包括TVL、交易量和手续费等信息。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />-
                    </div>
                  ) : (
                    totalStats.totalPools
                  )}
                </div>
                <div className="text-sm">总池数</div>
              </div>
              <Droplets className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />-
                    </div>
                  ) : (
                    formatLargeNumber(totalStats.totalTVL)
                  )}
                </div>
                <div className="text-sm">总锁仓价值</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />-
                    </div>
                  ) : (
                    formatLargeNumber(totalStats.totalVolume24h)
                  )}
                </div>
                <div className="text-sm">24小时交易量</div>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />-
                    </div>
                  ) : (
                    formatLargeNumber(totalStats.totalFeesGenerated)
                  )}
                </div>
                <div className="text-sm">累计费用收入</div>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* 池子列表 */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">所有流动性池</h2>
              <button
                onClick={handleCreatePool}
                className="bg-primary flex items-center gap-2 text-white px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建新池
              </button>
            </div>
          </div>
          {!isConnected ? (
            <div className="p-12">
              <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4"></Droplets>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                请连接钱包
              </h3>
              <p className="text-gray-500">请连接钱包，以查看流动性池数据</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              加载失败
              <button onClick={() => refetch()}>重新加载</button>
            </div>
          ) : loading ? (
            <div className="p-12">
              <Loader2 />
            </div>
          ) : pools.length === 0 ? (
            <div className="p-12 text-center">暂无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      交易对
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      费率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TVL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      代币余额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24小时交易量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      累计费用
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      流动性
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pools.map((pool) => (
                    <tr key={pool.pool} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex -space-x-2 mr-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-white text-xs font-bold">
                                {pool.token0Symbol.charAt(0)}
                              </span>
                            </div>
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-white text-xs font-bold">
                                {pool.token1Symbol.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pool.pair}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{pool.index}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {pool.feePercent}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {pool.tvl}
                        </div>
                        <span className="text-xs text-gray-500">
                          {pool.tvlUSD > 1000
                            ? `$${formatNumber(pool.tvlUSD)}`
                            : `$${pool.tvlUSD.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">
                          <div>
                            {parseFloat(pool.token0Balance).toFixed(2)}
                            {pool.token0Symbol}
                          </div>
                          <div>
                            {parseFloat(pool.token1Balance).toFixed(2)}
                            {pool.token1Symbol}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {pool.volume24h}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1  text-green-500" />
                          基于链上活动
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatLargeNumber(pool.feesUSD)}
                        </div>
                        <div className="text-xs text-gray-500">总费用收入</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatNumber(parseFloat(pool.liquidity))}
                        </div>
                        <div className="text-xs text-gray-500">LP 代币</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </NetworkChecker>
    </div>
  )
}
