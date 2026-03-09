import { useCallback, useState } from 'react'
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract
} from 'wagmi'

export interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  slippage: number
}

export function useSwap() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const [lastSwapParams, setLastSwapParams] = useState<SwapParams | null>(null)

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash
    })

  // 获取预估价格
  const getQuote = useCallback(() => {}, [])
  // 检查代币授权
  const useTokenAllowance = (tokenAddress: string) => {}
  // 授权代币
  const approveToken = useCallback(() => {}, [])
  // 执行交换
  const excuteSwap = useCallback(() => {}, [])
  return {
    getQuote,
    useTokenAllowance,
    approveToken,
    excuteSwap,
    lastSwapParams,
    isConfirming,
    isPending,
    isConfirmed,
    hash
  }
}
