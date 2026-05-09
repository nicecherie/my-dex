'use client'

import { usePools } from '@/hooks/usePools'
import { useSwap } from '@/hooks/useSwap'
import { toChainTokenAddress, TOKENS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import {
  cn,
  formatTokenAmount,
  parseInputAmount,
  shortenAddress
} from '@/lib/utils'
import { CheckCircle, ChevronDown, Clock, Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useBalance, useCall } from 'wagmi'

type Token = {
  address: string
  symbol: string
  name: string
  decimals: number
  supportsPermit?: boolean
}
const ETH_TOKEN: Token = {
  address: TOKENS.ETH.address,
  symbol: TOKENS.ETH.symbol,
  name: TOKENS.ETH.name,
  decimals: TOKENS.ETH.decimals,
  supportsPermit: false
}

const ETH_ADDRESS_LOWER = TOKENS.ETH.address.toLowerCase()
const WETH_ADDRESS_LOWER = TOKENS.ETH.wrappedAddress.toLowerCase()
const LEGACY_WETH_ADDRESS_LOWER = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'
const WRAPPED_ETH_ALIASES = new Set<string>([
  WETH_ADDRESS_LOWER,
  LEGACY_WETH_ADDRESS_LOWER
])

const EMPTY_INDEX_PATH: number[] = []

const FALLBACK_TOKEN_LIST: Token[] = [
  ETH_TOKEN,
  ...Object.values(TOKENS)
    .filter((token) => !('isNative' in token && token.isNative))
    .map((token) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      supportsPermit: false
    }))
]
export default function SwapInterface() {
  const [showSettings, setShowSettings] = useState(false)

  const { isConnected, address } = useAccount()

  const [slippage, setSlippage] = useState(0.5)
  const [tokenList, setTokenList] = useState<Token[]>(FALLBACK_TOKEN_LIST)
  const [fromToken, setFromToken] = useState<Token>(FALLBACK_TOKEN_LIST[0])
  const [toToken, setToToken] = useState<Token>(
    FALLBACK_TOKEN_LIST[1] ?? FALLBACK_TOKEN_LIST[0]
  )
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)
  const [isSimulated, setIsSimulated] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)

  const {
    getQuote,
    useTokenAllowance,
    approveToken,
    executeSwap,
    lastSwapParams,
    isConfirming,
    isPending,
    isConfirmed,
    hash
  } = useSwap()

  const { pools, loading: poolsLoading, error: poolsError } = usePools()

  // 地址转换小写
  const toComparableAddress = useCallback((tokenAddress: string) => {
    const normalized = tokenAddress.toLowerCase()
    if (
      normalized === ETH_ADDRESS_LOWER ||
      WRAPPED_ETH_ALIASES.has(normalized)
    ) {
      return ETH_ADDRESS_LOWER
    }
    return toChainTokenAddress(tokenAddress).toLowerCase() // 确保不是eth地址
  }, [])

  const isEthLikeAddress = (tokenAddress: string) => {
    const normalized = tokenAddress.toLowerCase()
    return (
      normalized === ETH_ADDRESS_LOWER || WRAPPED_ETH_ALIASES.has(normalized)
    )
  }

  // ETH 地址别名展开，确保在获取交易对和授权时，ETH 和 WETH 地址都能匹配到对应的池子和授权记录
  const expandAddressAlias = (tokenAddress: string) => {
    const normalized = tokenAddress.toLowerCase()
    if (
      normalized === ETH_ADDRESS_LOWER ||
      WRAPPED_ETH_ALIASES.has(normalized)
    ) {
      return [ETH_ADDRESS_LOWER, ...Array.from(WRAPPED_ETH_ALIASES)]
    }
    return [normalized]
  }
  // // 获取代币列表
  // const tokenList: Token[] = Object.values(TOKENS)
  useEffect(() => {
    if (
      isEthLikeAddress(fromToken.address) &&
      fromToken.address.toLowerCase() !== ETH_ADDRESS_LOWER
    ) {
      setFromToken(ETH_TOKEN)
    }

    if (
      isEthLikeAddress(toToken.address) &&
      toToken.address.toLowerCase() !== ETH_ADDRESS_LOWER
    ) {
      setToToken(ETH_TOKEN)
    }
  }, [fromToken.address, toToken.address])

  // 构建池子邻接表，方便根据选定的 fromToken 动态生成 toToken 选项列表
  const poolAdjacency = useMemo(() => {
    const adjacency = new Map<string, Set<string>>()

    const addEdge = (a: string, b: string) => {
      const keyA = a.toLowerCase()
      const keyB = b.toLowerCase()
      if (!adjacency.has(keyA)) adjacency.set(keyA, new Set())
      adjacency.get(keyA)!.add(keyB)
    }

    for (const pool of pools) {
      addEdge(pool.token0, pool.token1)
      addEdge(pool.token1, pool.token0)
    }
    return adjacency
  }, [pools])

  const getLinkedTokenOptions = useCallback(
    (baseTokenAddress: string, fallbackExcludeAddress?: string) => {
      const baseAliases = expandAddressAlias(baseTokenAddress)

      const linked = new Set<string>()

      for (const alias of baseAliases) {
        // 获取 baseTokenaddress 相关的池子列表
        for (const next of poolAdjacency.get(alias) ?? []) {
          linked.add(next)
          // 如果是eth，处理相关别名
          for (const nextAlias of expandAddressAlias(next)) {
            linked.add(nextAlias)
          }
        }
      }

      const excludeComparable = fallbackExcludeAddress
        ? toComparableAddress(fallbackExcludeAddress)
        : undefined

      // 如果没有池子，过滤tokenList
      if (!linked || linked.size === 0) {
        return tokenList.filter(
          (token) => toComparableAddress(token.address) !== excludeComparable
        )
      }

      // 否则，tokenList 保留 linked 中存在的 token
      return tokenList.filter((token) => {
        if (toComparableAddress(token.address) === excludeComparable)
          return false
        return expandAddressAlias(token.address).some((alias) =>
          linked.has(alias)
        )
      })
    },
    [poolAdjacency, tokenList]
  )
  const toTokenOptions = useMemo(() => {
    return getLinkedTokenOptions(fromToken.address, fromToken.address)
  }, [fromToken.address, getLinkedTokenOptions])
  const fromTokenOptions = useMemo(() => {
    return getLinkedTokenOptions(toToken.address, toToken.address)
  }, [toToken.address, getLinkedTokenOptions])

  const activePairPools = useMemo(() => {
    const from = toComparableAddress(fromToken.address)
    const to = toComparableAddress(toToken.address)
    return pools.filter((pool) => {
      const p0 = toComparableAddress(pool.token0)
      const p1 = toComparableAddress(pool.token1)
      return (p0 === from && p1 === to) || (p0 === to && p1 === from)
    })
  }, [pools, fromToken.address, toToken.address])

  // 拿到流动性最高的池
  const primaryPoolIndex = useMemo(() => {
    if (activePairPools.length === 0) return -1
    const sorted = [...activePairPools].sort((a, b) => {
      const liqA = Number(a.liquidity || '0')
      const liqB = Number(b.liquidity || '0')
      return liqB - liqA
    })
    return Number(sorted[0].index)
  }, [activePairPools])

  const selectedIndexPath = useMemo<number[]>(() => {
    if (primaryPoolIndex < 0) return EMPTY_INDEX_PATH
    return [primaryPoolIndex]
  }, [primaryPoolIndex])

  // 优先使用 Supabase 获取的代币列表，如果没有则使用本地常量（前端内置列表）
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const { data, error } = await supabase
          .from('tokens')
          .select('address, symbol, name, decimals, supports_permit')
          .order('symbol', { ascending: true })
        if (error) {
          throw error
        }

        const fetchedTokens = (data ?? [])
          .filter(
            (token) =>
              // 过滤掉没有对应合约的代币
              !!token.address &&
              !!token.symbol &&
              !!token.name &&
              typeof token.decimals === 'number' &&
              !WRAPPED_ETH_ALIASES.has(token.address.toLowerCase()) &&
              token.symbol.toUpperCase() !== 'WETH'
          )
          .map((token) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            supportsPermit: Boolean(token.supports_permit)
          }))

        const mergedTokenMap = new Map<string, Token>()
        for (const token of fetchedTokens) {
          mergedTokenMap.set(token.address.toLowerCase(), token)
        }
        // 添加 ETH 作为特殊代币
        mergedTokenMap.set(ETH_TOKEN.address.toLowerCase(), ETH_TOKEN)

        // 按照 symbol 字母顺序排序，ETH 始终排在最前面
        const mergedTokens = Array.from(mergedTokenMap.values()).sort(
          (a, b) => {
            if (a.address.toLowerCase() === ETH_ADDRESS_LOWER) return -1
            if (b.address.toLowerCase() === ETH_ADDRESS_LOWER) return 1
            return a.symbol.localeCompare(b.symbol)
          }
        )

        if (mergedTokens.length === 0) return

        setTokenList(mergedTokens)
        setFromToken((prev) => {
          return (
            mergedTokens.find(
              (token) =>
                token.address.toLowerCase() === prev.address.toLowerCase()
            ) ?? mergedTokens[0]
          )
        })
        setToToken((prev) => {
          return (
            mergedTokens.find(
              (token) =>
                token.address.toLowerCase() === prev.address.toLowerCase()
            ) ??
            mergedTokens[1] ??
            mergedTokens[0]
          )
        })
      } catch (error) {
        console.error('加载代币列表失败:', error)
      }
    }
    loadTokens()
  }, [])

  // 获取用户余额
  const { data: fromTokenBalance } = useBalance({
    address,
    token: isEthLikeAddress(fromToken.address)
      ? undefined
      : (toChainTokenAddress(fromToken.address) as `0x${string}`),
    query: {
      enabled: Boolean(
        isConnected && address && !isEthLikeAddress(fromToken.address)
      )
    }
  })
  const { data: toTokenBalance } = useBalance({
    address,
    token: isEthLikeAddress(toToken.address)
      ? undefined
      : (toChainTokenAddress(toToken.address) as `0x${string}`),
    query: {
      enabled: Boolean(
        isConnected && address && !isEthLikeAddress(toToken.address)
      )
    }
  })

  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: Boolean(address && isConnected)
    }
  })

  const displayFromBalance = isEthLikeAddress(fromToken.address)
    ? nativeBalance
    : fromTokenBalance
  const displayToBalance = isEthLikeAddress(toToken.address)
    ? nativeBalance
    : toTokenBalance

  //TODO: 处理授权
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
    label,
    options
  }: {
    selectedToken: Token
    onSelect: (token: Token) => void
    label: string
    options: Token[]
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
              {options.length === 0 && (
                <div className="text-sm text-muted-foreground px-2 py-1">
                  暂无可交易池
                </div>
              )}
              {options.map((token) => (
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
  console.log(JSON.stringify(tokenList), 'tokenList')
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
              {displayFromBalance
                ? formatTokenAmount(displayFromBalance.formatted)
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
              options={fromTokenOptions}
            />
          </div>
        </div>

        {/* to token 选择框 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span>到</span>
            <span>
              余额：
              {displayToBalance
                ? formatTokenAmount(displayToBalance.formatted)
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
              options={toTokenOptions}
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
