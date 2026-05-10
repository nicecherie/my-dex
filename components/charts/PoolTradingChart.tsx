'use client'

import { sqrtPriceX96ToPrice } from '@/lib/utils'
import {
  AreaSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp
} from 'lightweight-charts'
import { useEffect, useMemo, useRef } from 'react'
type SwapPoint = {
  sqrt_price_x96: string
  amount0: string
  amount1: string
  block_timestamp: string
}
type PoolTradingChartProps = {
  swap: SwapPoint[]
  token1Symbol: string
  token0Symbol: string
  token0Decimals: number
  token1Decimals: number
}

type PricePoint = {
  time: UTCTimestamp
  value: number
}

type VolumePoint = {
  time: UTCTimestamp
  value: number
}

export default function PoolTradingChart({
  swap,
  token1Symbol,
  token0Symbol,
  token0Decimals,
  token1Decimals
}: PoolTradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  const chartData = useMemo(() => {
    const sortedSwaps = [...swap].sort(
      (a, b) =>
        new Date(a.block_timestamp).getTime() -
        new Date(b.block_timestamp).getTime()
    )

    const priceData: PricePoint[] = []
    const volumeData: VolumePoint[] = []

    for (const swap of sortedSwaps) {
      const timestamp = Math.floor(
        new Date(swap.block_timestamp).getTime() / 1000
      ) as UTCTimestamp // Convert to seconds
      const price = sqrtPriceX96ToPrice(
        swap.sqrt_price_x96,
        token0Decimals,
        token1Decimals
      )
      const amount0 = Math.abs(Number(swap.amount0)) / 10 ** token0Decimals
      const amount1 = Math.abs(Number(swap.amount1)) / 10 ** token1Decimals
      const volumeToken1 = amount1 > 0 ? amount1 : amount0 * price // Use token1 volume if available, otherwise convert token0 to token1 value

      if (!Number.isFinite(price) || price <= 0) {
        continue // Skip invalid price points
      }

      priceData.push({ time: timestamp, value: price })
      volumeData.push({
        time: timestamp,
        value: volumeToken1 // Green for buys, red for sells
      })
    }

    return { priceData, volumeData }
  }, [swap, token0Decimals, token1Decimals])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#475569'
      },
      grid: {
        vertLines: {
          color: '#f1f5f9'
        },
        horzLines: { color: '#f1f5f9' }
      },
      crosshair: {
        vertLine: { color: '#94a3b8', labelBackgroundColor: '#2563eb' },
        horzLine: { color: '#94a3b8', labelBackgroundColor: '#2563eb' }
      },
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false
      },
      localization: {
        priceFormatter: (value: number) => value.toFixed(6)
      }
    })
    chartRef.current = chart

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#2563eb',
      topColor: 'rgba(37, 99, 235, .24)',
      bottomColor: 'rgba(37,99,235, .02)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: ''
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    })

    areaSeries.setData(chartData.priceData)
    volumeSeries.setData(chartData.volumeData)
    chart.timeScale().fitContent()

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !chartRef.current) return
      chartRef.current.applyOptions({
        width: entry.contentRect.width
      })
    })

    resizeObserver.observe(containerRef.current) // 开始监听

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [chartData])
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="text-lg font-bold text-gray-900">Price & Volume</div>
      <p className="text-sm text-gray-500">
        {token1Symbol} per {token0Symbol} with swap volume overlay
      </p>
      <div className="h-64 flex items-center justify-center text-gray-500">
        {chartData.priceData.length === 0 ? (
          <div>No swap data available to display the chart.</div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}
      </div>
    </div>
  )
}
