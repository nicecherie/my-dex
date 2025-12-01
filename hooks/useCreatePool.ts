'use client'

import { TOKENS } from '@/lib/constants'
import { contractConfig } from '@/lib/contracts'
import { useState } from 'react'
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract
} from 'wagmi'

// Uniswap V3 价格计算相关常量
const Q96 = BigInt(2) ** BigInt(96)

// 价格转换函数：从价格比率计算 sqrtPriceX96
// 假设初始价格比率为1:1
const encodePriceSqrt = (reverse1: bigint, reverse0: bigint) => {
  return (reverse1 * Q96) / reverse0
}

// 从费率计算 tick 范围的简化版本
const getTickRange = (
  fee: number
): { tickLower: number; tickUpper: number } => {
  switch (fee) {
    case 500:
      return { tickLower: -60, tickUpper: 60 }
    case 3000:
      return { tickLower: -887220, tickUpper: 887220 }
    case 10000:
      return { tickLower: -887220, tickUpper: 887220 }
    default:
      return {
        tickLower: -887220,
        tickUpper: 887220
      }
  }
}

export interface CreatePoolParams {
  token0: string
  token1: string
  fee: number
}

export const useCreatePool = () => {
  const { address } = useAccount()
  const [isCreating, setIsCreating] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const { writeContract, data: hash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash
    })
  const createPool = async (params: CreatePoolParams) => {
    if (!address) {
      throw new Error('请先连接钱包')
    }
    const { token0, token1, fee } = params

    // 确保token0地址小于token1地址 (Uniswap V3约定)
    const [sortedToken0, sortedToken1] =
      token0.toLowerCase() < token1.toLowerCase()
        ? [token0, token1]
        : [token1, token0]

    // 获取代币信息用于验证
    const token0Info = Object.values(TOKENS).find(
      (token) => token.address.toLowerCase() === sortedToken0.toLowerCase()
    )
    const token1Info = Object.values(TOKENS).find(
      (token) => token.address.toLowerCase() === sortedToken1.toLowerCase()
    )
    if (!token0Info || !token1Info) {
      throw new Error('无效的代币地址')
    }
    try {
      setIsCreating(true)

      // 计算初始价格 （1:1比率）
      const sqrtPriceX96 = encodePriceSqrt(
        BigInt(10) ** BigInt(token1Info.decimals),
        BigInt(10) ** BigInt(token0Info.decimals)
      )

      // 获取 tick 范围
      const { tickLower, tickUpper } = getTickRange(fee)

      // 构造创建池子的参数
      const createPoolParams = {
        token0: token0Info.address,
        token1: token1Info.address,
        fee,
        sqrtPriceX96,
        tickLower,
        tickUpper
      }
      console.log('createPoolParams', {
        ...createPoolParams,
        token0: token0Info.symbol,
        token1: token1Info.symbol,
        sqrtPriceX96: sqrtPriceX96.toString()
      })

      // 调用智能合约创建池子
      await writeContract({
        ...contractConfig.poolManager,
        functionName: 'createAndInitializePoolIfNecessary',
        args: [createPoolParams]
      })

      if (hash) {
        setTxHash(hash)
      }
    } catch (error) {
      console.error('创建池子失败:', error)
      throw error
    } finally {
      setIsCreating(false)
    }
  }
  return {
    createPool,
    isCreating: isCreating || isConfirming,
    isConfirmed,
    txHash: hash || txHash,
    error: writeError
  }
}
