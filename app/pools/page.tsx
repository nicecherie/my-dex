'use client'

import { NetworkChecker } from '@/components/NetworkChecker'
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
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

// 根据 api 响应数据，定义响应字段
interface PoolData {
  pool: string
  token0: string
  token1: string
  token0Symbol: string
  token1Symbol: string
  token0Decimals: string
  token1Decimals: string
  fee: number
  feePercent: string
  liquidity: string
  sqrtPriceX96: string
  tick: number
  tvl: string
  tvlUSD: number
  volume24h: string
  feesUSD: number
  pair: string
  index: number
  token0Balance: string
  token1Balance: string
}

export default function PoolsPage() {
  const { isConnected } = useAccount()
  const [pools, setPools] = useState<PoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStatus, setTotalStatus] = useState({
    totalPools: 0,
    totalTVL: 0,
    totalVolume24h: 0,
    totalFeesGenerated: 0
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  // const { pools, loading, error, totalStats, refetch } = usePools()
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

  const fetchPools = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pools')
      if (!response.ok) {
        throw new Error('Failed to fetch pools')
      }
      const data = await response.json()
      setPools(data.data)
      setPagination(data.pagination)
      setTotalStatus({
        totalPools: data.pagination.total || 0,
        totalTVL: data.data.reduce(
          (sum: number, pool: PoolData) => sum + pool.tvlUSD,
          0
        ),
        totalVolume24h: data.data.reduce(
          (sum: number, pool: PoolData) => sum + parseFloat(pool.volume24h),
          0
        ),
        totalFeesGenerated: data.data.reduce(
          (sum: number, pool: PoolData) => sum + pool.feesUSD,
          0
        )
      })
    } catch (err) {
      console.error('Error loading pools', err)
      setError(err instanceof Error ? err.message : '加载池子数据失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchPools()
  }, [])
  const handleCreatePool = () => {
    router.push('/liquidity')
  }
  return (
    <div>
      <NetworkChecker>
        {/* 池子列表 */}
        <div className="rounded-lg overflow-hidden">
          {/* 表格内容 */}
          <div className="p-6">
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
              <button onClick={() => fetchPools()}>重新加载</button>
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
              {/* 页码 */}
              <div className="px-6 py-4 text-sm text-gray-500 flex ">
                {pagination.page} / {pagination.totalPages}
              </div>
            </div>
          )}
        </div>
      </NetworkChecker>
    </div>
  )
}
