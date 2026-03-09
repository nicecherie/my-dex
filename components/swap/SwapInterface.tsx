'use client'

import { usePools } from '@/hooks/usePools'
import { useSwap } from '@/hooks/useSwap'
import { TOKENS } from '@/lib/constants'
import {
  cn,
  formatTokenAmount,
  parseInputAmount,
  shortenAddress
} from '@/lib/utils'
import { CheckCircle, ChevronDown, Clock, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'

type Token = {
  address: string
  symbol: string
  name: string
  decimals: number
}

export default function SwapInterface() {
  const [showSettings, setShowSettings] = useState(false)

  const { isConnected, address } = useAccount()

  const [slippage, setSlippage] = useState(0.5)
  const [fromToken, setFromToken] = useState<Token>(TOKENS.MNTokenA)
  const [toToken, setToToken] = useState<Token>(TOKENS.MNTokenB)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)
  const [isSimulated, setIsSimulated] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)

  const {
    getQuote,
    useTokenAllowance,
    approveToken,
    excuteSwap,
    lastSwapParams,
    isConfirming,
    isPending,
    isConfirmed,
    hash
  } = useSwap()

  const { pools } = usePools()

  // 获取代币列表
  const tokenList: Token[] = Object.values(TOKENS)
  // 获取用户余额
  const { data: fromTokenBalance } = useBalance({
    address,
    token: fromToken.address as `0x${string}`,
    query: {
      enabled: Boolean(isConnected && address)
    }
  })
  const { data: toTokenBalance } = useBalance({
    address,
    token: toToken.address as `0x${string}`,
    query: {
      enabled: Boolean(isConnected && address)
    }
  })
  // 处理输入金额
  const handleFromAmountChange = (value: string) => {
    const parsed = parseInputAmount(value)
    setFromAmount(parsed)
  }
  const handleApprove = () => {}
  // 处理交易
  const handleSwap = () => {}

  // 处理代币选择
  const TokenSelector = ({
    selectedToken,
    onSelect,
    label
  }: {
    selectedToken: Token
    onSelect: (token: Token) => void
    label: string
  }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {selectedToken.symbol[0]}
            </span>
          </div>
          <span className="font-medium">{selectedToken.symbol}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="text-sm text-muted-foreground px-2 py-1">
                {label}
              </div>
              {tokenList.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center space-x-3 px-2 py-2 rounded hover:bg-accent transition-colors',
                    selectedToken.address === token.address && 'bg-accent'
                  )}
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {token.symbol[0]}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      {token.symbol}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {token.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const TranscationStatus = () => {
    if (!hash) return null

    return (
      <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center space-x-2">
          {isPending && (
            <>
              <Clock className="w-4 h-4 text-primary animate-spin" />
              <span className="text-primary">等待钱包确认...</span>
            </>
          )}
          {isConfirming && (
            <>
              <Clock className="w-4 h-4 text-primary animate-spin" />
              <span className="text-primary">交易确认中...</span>
            </>
          )}
          {isConfirmed && (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">
                交易成功！
              </span>
            </>
          )}
        </div>
        <div className="mt-2 text-sm text-primary">
          交易哈希:{shortenAddress(hash)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-x-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-card-foreground">交换</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 交易状态 */}
        <TranscationStatus />
        {/* 钱包状态 */}
        {isConnected && address && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="text-sm text-primary">
              已连接：{shortenAddress(address)}
            </div>
          </div>
        )}
        {/* 滑点容忍度 */}
        {showSettings && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              滑点容忍度
            </div>
            <div className="flex space-x-2">
              {[0.1, 0.5, 1].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setSlippage(value)
                  }}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    slippage === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:bg-accent'
                  )}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        )}
        {/* from token 选择框 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span>从</span>
            <span>
              余额：
              {fromTokenBalance
                ? formatTokenAmount(fromTokenBalance.formatted)
                : '0.00'}
            </span>
          </div>
          {/* 输入框和代币选择 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0"
              className="flex-1 text-2xl font-medium bg-transparent outline-none
                text-foreground placeholder:text-muted-foreground"
            />
            {/* 选择代币 */}
            <TokenSelector
              selectedToken={fromToken}
              onSelect={setFromToken}
              label="选择代币"
            />
          </div>
        </div>

        {/* to token 选择框 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span>到</span>
            <span>
              余额：
              {toTokenBalance
                ? formatTokenAmount(toTokenBalance.formatted)
                : '0.00'}
            </span>
          </div>
          {/* 输入框和代币选择 */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="text-2xl font-medium text-foreground">
              {isQuoting ? (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 animate-spin mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">获取报价中...</span>
                </div>
              ) : (
                toAmount || '0'
              )}
            </div>
            {/* <input
              type="text"
              disabled
              value={toAmount || '0'}
              placeholder="0"
              className="flex-1 text-2xl font-medium bg-transparent outline-none
                text-foreground placeholder:text-muted-foreground"
            /> */}
            {/* 选择代币 */}
            <TokenSelector
              selectedToken={toToken}
              onSelect={setToToken}
              label="选择代币"
            />
          </div>
          {isSimulated && (
            <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ 模拟报价，实际价格可能有差异
            </div>
          )}
        </div>
        {/* 交换按钮 */}
        <div className="space-y-3">
          {!isConnected ? (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground">请先连接钱包</p>
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isPending || isConfirming || !fromAmount}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disable:bg-gray-300 disabled:cursor-not-allowd text-white font-medium px-4 py-3 rounded-lg transition-colors"
            >
              {isPending || isConfirming ? '交换中...' : '交换'}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={
                isPending ||
                isConfirming ||
                !fromAmount ||
                !toAmount ||
                parseFloat(fromAmount) === 0
              }
              className="w-full bg-primary hover:bg-primary/60 disable:bg-muted disabled:cursor-not-allowd text-primary-foreground font-medium px-4 py-3 rounded-lg transition-colors"
            >
              {isPending || isConfirming ? '交换中...' : '交换'}
            </button>
          )}
        </div>

        {/* Price Info */}
        {fromAmount &&
          toAmount &&
          parseFloat(fromAmount) > 0 &&
          parseFloat(toAmount) > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              1 {fromToken.symbol} ≈{' '}
              {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)}{' '}
              {toToken.symbol}
            </div>
          )}
      </div>
    </div>
  )
}
