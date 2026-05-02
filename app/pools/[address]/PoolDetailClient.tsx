'use client'
import PoolTradingChart from '@/components/charts/PoolTradingChart'
import { formatNumber, shortenAddress } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface PoolDetailProps {
  address: string
}

interface PoolData {
  pool: string
  token0: string
  token1: string
  token0Symbol: string
  token1Symbol: string
  token0Name: string
  token1Name: string
  token0Decimals: number
  token1Decimals: number
  fee: number
  feePercent: string
  liquidity: string
  sqrtPriceX96: string
  tick: number
  tickLower: number
  tickUpper: number
  createdAt: string
}
interface SwapData {
  transactionHash: string
  log_index: number
  pool_address: string
  sender: string
  recipient: string
  sqrt_price_x96: string
  amount0: string
  amount1: string
  liquidity: string
  tick: number
  block_number: number
  block_timestamp: string
}
export default function PoolDetailClient({ address }: PoolDetailProps) {
  const [pool, setPool] = useState<PoolData | null>(null)
  const [swaps, setSwaps] = useState<SwapData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const poolRes = await fetch(`/api/pools/${address}`)
        if (!poolRes.ok) {
          throw new Error('Failed to fetch pool data')
        }
        const poolJson = await poolRes.json()
        setPool(poolJson.data)

        const swapsRes = await fetch(`/api/pools/${address}/swaps`)
        if (!swapsRes.ok) {
          throw new Error('Failed to fetch swaps data')
        }
        const swapsJson = await swapsRes.json()
        setSwaps(swapsJson.data)
      } catch (err) {
        console.error('Error fetching pool data:', err)
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    if (address) {
      fetchData()
    }
  }, [address])

  // 计算价格
  const calculatePrices = () => {
    if (!pool) return { price0: '0', price1: '0', minPrice: '0', maxPrice: '0' }

    const sqrPriceX96 = BigInt(pool.sqrtPriceX96)
    const two96 = BigInt(2) ** BigInt(96)

    const priceRatio = Number(sqrPriceX96) / Number(two96)
    const priceRaw = priceRatio ** 2

    const decimalDiff = pool.token0Decimals - pool.token1Decimals
    const priceAdjusted = priceRaw * 10 ** decimalDiff

    const getPriceFromTick = (tick: number) => {
      const priceFromTick = 1.0001 ** tick
      return priceFromTick * 10 ** decimalDiff
    }

    return {
      currentPrice: priceAdjusted,
      minPrice: getPriceFromTick(pool.tickLower),
      maxPrice: getPriceFromTick(pool.tickUpper)
    }
  }

  const { currentPrice = 0, minPrice = 0, maxPrice = 0 } = calculatePrices()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pool data...</div>
      </div>
    )
  }

  if (error || !pool) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Pool not found.</div>
        <Link href="/pools" className="text-blue-500 hover:underline">
          Back to Pools
        </Link>
      </div>
    )
  }
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/pools"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            {/* Token Symbols */}
            <div className="flex -space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white text-white font-bold shadow-sm">
                {pool?.token0Symbol[0]}
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center border-2 border-white text-white font-bold shadow-sm">
                {pool?.token1Symbol[0]}
              </div>
            </div>
            {/* Token Names */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {pool?.token0Symbol} / {pool?.token1Symbol}
                <span className="px-2 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                  {pool?.feePercent}
                </span>
              </h1>
              <div className="text-sm text-gray-500 flex gap-2">
                <span>{pool?.token0Name}</span>
                <span className="mx-1">•</span>
                <span>{pool?.token1Name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/liquidity?pool=${pool?.pool}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Liquidity
            </Link>
            <Link
              href={`/?tokenIn=${pool?.token0}&tokenOut=${pool?.token1}`}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Swap
            </Link>
          </div>
        </div>
      </div>
      {/* Pool Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left column: status & chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-500">Current Price</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  1 {pool?.token0Symbol} = {formatNumber(Number(currentPrice))}{' '}
                  {pool?.token1Symbol}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  1 {pool?.token1Symbol} ={' '}
                  {formatNumber(1 / Number(currentPrice))} {pool?.token0Symbol}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Liquidity</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(Number(pool?.liquidity))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Current Tick</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {pool?.tick}
                </div>
              </div>
            </div>
          </div>
          {/* Chart */}
          <PoolTradingChart
            swap={swaps}
            token1Symbol={pool.token1Symbol}
            token0Symbol={pool.token0Symbol}
            token0Decimals={pool.token0Decimals}
            token1Decimals={pool.token1Decimals}
          />
        </div>
        {/* right column: details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Pool Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between ">
                <span className="text-gray-500">Pool Address</span>
                <span className="font-mono text-sm">
                  {shortenAddress(pool?.pool || '')}
                </span>
              </div>
              <div className="flex justify-between ">
                <span className="text-gray-500">Token 0</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${pool?.token0}`}
                  target="_blank"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  {pool?.token0Symbol} {'  '}
                  <span className="ml-1 text-xs text-gray-400">
                    ({shortenAddress(pool?.token0 || '')})
                  </span>
                </a>
              </div>
              <div className="flex justify-between ">
                <span className="text-gray-500">Token 1</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${pool?.token1}`}
                  target="_blank"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  {pool?.token1Symbol} {'  '}
                  <span className="ml-1 text-xs text-gray-400">
                    ({shortenAddress(pool?.token1 || '')})
                  </span>
                </a>
              </div>
              <div className="flex justify-between ">
                <span className="text-gray-500">Fee Tier</span>
                <span className="font-medium">{pool?.feePercent}</span>
              </div>
              <div className="flex justify-between ">
                <span className="text-gray-500">Created At</span>
                <span className="font-mono text-sm">
                  {new Date(pool.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
