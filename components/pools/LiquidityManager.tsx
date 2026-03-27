'use client'

import { ArrowRight, ArrowUpDown, ChevronDown, Clock, Info } from 'lucide-react'
import { useCallback, useState } from 'react'
import {
  FEE_TIERS,
  isNativeTokenAddress,
  toChainTokenAddress,
  TOKENS
} from '@/lib/constants'
import {
  cn,
  formatTokenAmount,
  parseInputAmount,
  shortenAddress
} from '@/lib/utils'
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract
} from 'wagmi'
import { ERC20_ABI } from '@/lib/contracts'
import { BaseError, parseUnits } from 'viem'

const GAS_LIMIT_CAP = 16_000_000n
type Step = 'select' | 'searching' | 'found' | 'notFound' | 'addLiquidity'
type TransactionAction =
  | 'wrap0'
  | 'wrap1'
  | 'approve0'
  | 'approve1'
  | 'createPool'
  | 'addLiquidity'

type Token = {
  address: string
  symbol: string
  name: string
  decimals: number
}

type ContractWriteParams = {
  address: `0x${string}`
  abi: readonly unknown[]
  functionName: string
  args: readonly unknown[] | [unknown]
  value?: bigint
}
const WETH_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: []
  }
] as const

export default function LiquidityManager() {
  // 获取用户钱包信息
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()

  // 用户余额查询数据处理：native token显示为ETH，其他代币显示为symbol
  const getRequireBalanceLabel = useCallback((token: Token | null) => {
    if (!token) return '代币'
    if (isNativeTokenAddress(token.address)) {
      return 'WETH'
    }
    return token.symbol
  }, [])

  // 当前步骤状态
  const [step, setStep] = useState<Step>('select')
  // const [step, setStep] = useState<Step>('searching')

  const tokenList = Object.values(TOKENS)
  // 选择的交易对参数
  const [selectedToken0Address, setSelectedToken0Address] = useState<string>('')
  const [selectedToken1Address, setSelectedToken1Address] = useState<string>('')
  const [selectedFee, setSelectedFee] = useState<number>(FEE_TIERS[0])
  const [selectedChainId, setSelectedChainId] = useState<number>(11155111)

  const [isCheckingPool, setIsCheckingPool] = useState<boolean>(false)
  // 实际选中的 Token 对象
  const [token0, setToken0] = useState<Token | null>(null)
  const [token1, setToken1] = useState<Token | null>(null)

  const [initialPrice, setInitialPrice] = useState('1')
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')

  const [searchError, setSearchError] = useState<string | null>(null)
  const [poolExists, setPoolExists] = useState<boolean>(false)
  const [currentPool, setCurrentPool] = useState<string | null>(null)
  const [poolIndex, setPoolIndex] = useState<number | null>(null)

  const [needsApproval0, setNeedsApproval0] = useState<boolean>(false)
  const [needsApproval1, setNeedsApproval1] = useState<boolean>(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  const [transactionAction, setTransactionAction] =
    useState<TransactionAction | null>(null)
  const [transactionError, setTransactionError] = useState<string | null>(null)

  // 合约交互
  const { writeContract, data: hash, isPending } = useWriteContract()

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof BaseError) {
      return error.shortMessage || error.message
    }
    if (error instanceof Error) {
      return error.message
    }

    return '交易提交失败'
  }, [])

  const writeContractWithEstimatedGas = useCallback(
    async ({
      address: contractAddress,
      abi,
      functionName,
      args,
      value
    }: ContractWriteParams) => {
      if (!address) {
        throw new Error('钱包未连接')
      }

      if (!publicClient) {
        throw new Error('公共客户端未初始化')
      }

      const estimatedGas = await publicClient.estimateContractGas({
        account: address,
        address: contractAddress,
        abi,
        functionName,
        args,
        value
      } as never)

      const gas = (estimatedGas * 12n) / 10n // 安全余量 buffer

      writeContract({
        account: address,
        address: contractAddress,
        abi,
        functionName,
        args,
        value,
        gas: gas > GAS_LIMIT_CAP ? GAS_LIMIT_CAP : gas
      } as never)
    },
    [address, publicClient, writeContract]
  )

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  // TODO: 当用户输入地址时，自动查询并显示代币信息（symbol, decimals等），可以使用useReadContracts批量查询两个代币的信息
  // const { data: token0Data } = useReadContracts({
  //   contracts: [],
  //   query: {
  //     enabled: !!selectedToken0Address
  //   }
  // })
  // console.log('token0Data', token0Data)

  // 获取代币余额
  const { data: token0Balance, refetch: refetchToken0Balance } = useBalance({
    address: address,
    token: token0
      ? (toChainTokenAddress(token0.address) as `0x${string}`)
      : undefined,
    query: {
      enabled: Boolean(address && isConnected && token0)
    }
  })

  const { data: token1Balance, refetch: refetchToken1Balance } = useBalance({
    address: address,
    token: token1
      ? (toChainTokenAddress(token1.address) as `0x${string}`)
      : undefined,
    query: {
      enabled: Boolean(address && isConnected && token1)
    }
  })

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    query: {
      enabled: Boolean(address && isConnected)
    }
  })

  console.log('nativeBalance', nativeBalance)
  console.log('address', address)
  console.log('token0', token0)

  const refreshBalances = useCallback(async () => {
    await Promise.all([
      refetchToken0Balance(),
      refetchToken1Balance(),
      refetchNativeBalance()
    ])
  }, [refetchToken0Balance, refetchToken1Balance, refetchNativeBalance])

  // 判断两种代币是否有余额
  const hasInsuffientBalance0 = (() => {
    const availableBalance =
      token0 && isNativeTokenAddress(token0.address)
        ? nativeBalance
        : token0Balance

    if (!token0 || !availableBalance || !amount0) return false
    try {
      return parseUnits(amount0, token0.decimals) > availableBalance.value
    } catch {
      return false
    }
  })()
  const hasInsuffientBalance1 = (() => {
    const availableBalance =
      token0 && isNativeTokenAddress(token0.address)
        ? nativeBalance
        : token0Balance

    if (!token0 || !availableBalance || !amount0) return false
    try {
      return parseUnits(amount0, token0.decimals) > availableBalance.value
    } catch {
      return false
    }
  })()

  // 输入值 转换 链上值
  const needsWrap0 = (() => {
    if (
      !token0 ||
      !isNativeTokenAddress(token0.address) ||
      !token0Balance ||
      !amount0
    )
      return false
    try {
      return parseUnits(amount0, token0.decimals) > token0Balance.value
    } catch (error) {
      return false
    }
  })()

  const needsWrap1 = (() => {
    if (
      !token1 ||
      !isNativeTokenAddress(token1.address) ||
      !token1Balance ||
      !amount1
    )
      return false
    try {
      return parseUnits(amount1, token1.decimals) > token1Balance.value
    } catch (error) {
      return false
    }
  })()

  const wrapToken = useCallback(
    async (token: Token, amount: string, currentWrappedBalance?: bigint) => {
      if (!address || !isNativeTokenAddress(token.address)) return

      try {
        const desiredAmount = parseUnits(amount, token.decimals)
        const wrappedBalance = currentWrappedBalance ?? BigInt(0)
        const wrapAmount =
          desiredAmount > wrappedBalance
            ? desiredAmount - wrappedBalance
            : BigInt(0)

        if (wrapAmount <= 0) return

        setTransactionAction(
          token.address === token0?.address ? 'wrap0' : 'wrap1'
        )
        setTransactionError(null)

        await writeContractWithEstimatedGas({
          address: TOKENS.ETH.wrappedAddress as `0x${string}`,
          abi: WETH_ABI,
          functionName: 'deposit',
          args: [],
          value: wrapAmount
        })
      } catch (error) {
        setTransactionAction(null)
        setTransactionError(getErrorMessage(error))
      }
    },
    [address, token0?.address, writeContractWithEstimatedGas, getErrorMessage]
  )

  // 输入代币数量时自动计算另外一种代币数量
  const calculateAmount = useCallback(
    async (inputToken: 'token0' | 'token1', amount: string) => {
      if (!amount || parseFloat(amount) === 0) {
        if (inputToken === 'token0') {
          setAmount1('')
        } else {
          setAmount0('')
        }
      }

      setIsCalculating(true)
      setPriceError(null)

      try {
        if (poolExists && currentPool && token0 && token1) {
          // 如果池子存在，使用池子价格计算
          const response = await fetch('/api/pools/price', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              poolAddress: currentPool,
              inputToken:
                inputToken === 'token0' ? token0.address : token1.address,
              inputAmount: amount
            })
          })

          const data = await response.json()

          if (!response.ok || !data.success) {
            const errorMsg = data.msg || data.error || '计算价格失败'
            setPriceError(errorMsg)
            // 如果计算失败，清空对应的输入金额
            if (inputToken === 'token0') {
              setAmount1('')
            } else {
              setAmount0('')
            }
            return
          }

          // 计算成功
          if (inputToken === 'token0') {
            setAmount1(data.outputAmount)
          } else {
            setAmount0(data.outputAmount)
          }
          setPriceError(null)
        } else {
          // 如果池子不存在，使用初始价格比率计算
          const priceRatio = parseFloat(initialPrice)
          if (priceRatio > 0 && isFinite(priceRatio)) {
            try {
              if (inputToken === 'token0') {
                const calculated = parseFloat(amount) * priceRatio
                setAmount1(isNaN(calculated) ? '' : calculated.toString())
              } else {
                const calculated = parseFloat(amount) * priceRatio
                setAmount0(isNaN(calculated) ? '' : calculated.toString())
              }
              setPriceError(null)
            } catch (error) {
              console.log('价格计算错误', error)
              setPriceError('价格失败，请检查输入')
              if (inputToken === 'token0') {
                setAmount1('')
              } else {
                setAmount0('')
              }
            }
          } else {
            // 默认 1:1
            if (inputToken === 'token0') {
              setAmount1(amount)
            } else {
              setAmount0(amount)
            }
            setPriceError(null)
          }
        }
      } catch (error) {
        console.log('计算数量失败：', error)
        const errorMsg = error instanceof Error ? error.message : '计算价格失败'
        setPriceError(errorMsg)

        if (inputToken === 'token0') {
          setAmount1('')
        } else {
          setAmount0('')
        }
      } finally {
        setIsCalculating(false)
      }
    },
    [poolExists, currentPool, token0, token1, initialPrice]
  )

  const handleAmount0Change = (value: string) => {
    const parsed = parseInputAmount(value)
    setAmount0(parsed)
    // 这里可以添加逻辑，自动计算amount1的值
    calculateAmount('token0', parsed)
  }

  const handleAmount1Change = (value: string) => {
    const parsed = parseInputAmount(value)
    setAmount1(parsed)
    calculateAmount('token1', parsed)
  }

  const handleSwapTokens = () => {}

  const handleInitialPriceChange = (value: string) => {
    // 这里可以添加输入验证，确保用户输入的是有效的数字
    const parsedValue = parseInputAmount(value)
    setInitialPrice(parsedValue)
    // 重新计算数量
    if (amount0) {
      calculateAmount('token0', amount0)
    } else if (amount1) {
      calculateAmount('token1', amount1)
    }
  }

  const backToSelect = () => {
    setStep('select')
    setSearchError(null)
  }

  const createNewPool = () => {
    setStep('addLiquidity')
  }

  const searchPool = useCallback(async () => {
    if (!selectedToken0Address || !selectedToken1Address) {
      setSearchError('请选择两个代币')
      return
    }
    if (
      selectedToken0Address.toLowerCase() ===
      selectedToken1Address.toLowerCase()
    ) {
      setSearchError('请选择不同的代币')
      return
    }
    setStep('searching')
    setIsCheckingPool(true)
    setSearchError(null)

    try {
      const response = await fetch('/api/pools/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token0: selectedToken0Address,
          token1: selectedToken1Address,
          fee: selectedFee
          // chainId: selectedChainId
        })
      }).then((res) => res.json())

      if (response.success && response.exists) {
        setPoolExists(true)
        setCurrentPool(response.poolAddress)
        setPoolIndex(response.poolIndex)
        setStep('found')
        // 这里可以存储池子地址和索引，供后续添加流动性使用
        console.log(
          '找到池子:',
          response.poolAddress,
          '索引:',
          response.poolIndex
        )
      } else {
        setPoolExists(false)
        setCurrentPool(null)
        setPoolIndex(null)
        setStep('notFound')
      }
    } catch (error) {
      console.error('搜索池子失败:', error)
      setSearchError(
        error instanceof Error ? error.message : '搜索池子失败，请重试'
      )
      setPoolExists(false)
      setCurrentPool(null)
      setPoolIndex(null)
      setStep('notFound')
    } finally {
      setIsCheckingPool(false)
    }
  }, [
    selectedToken0Address,
    selectedToken1Address,
    selectedFee,
    selectedChainId
  ])

  const TokenSelector = ({
    selectedToken,
    onSelect,
    label,
    otherToken
  }: {
    selectedToken: Token
    onSelect: (token: Token) => void
    label: string
    otherToken: Token
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            <span className="font-bold text-white text-xs">
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
                    // alert(token.address)
                    setIsOpen(false)
                  }}
                  disabled={token.address === otherToken.address}
                  className={cn(
                    'w-full flex items-center space-x-3 px-2 py-2 rounded transition-colors',
                    selectedToken.address === token.address && 'bg-accent',
                    token.address === otherToken.address
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-accent'
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

  const renderSelect = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          选择交易对参数
        </h3>
        {/* Token0 Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-muted-foreground">
            代币 0 地址
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={selectedToken0Address}
              onChange={(e) => setSelectedToken0Address(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <TokenSelector
              selectedToken={token0 || tokenList[0]}
              onSelect={(token) => {
                setSelectedToken0Address(token.address)
                setToken0(token)
              }}
              label="选择 Token0"
              otherToken={token1 || tokenList[1]}
            />
          </div>
        </div>
        {/* Token1 Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-muted-foreground">
            代币 1 地址
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={selectedToken1Address}
              onChange={(e) => setSelectedToken1Address(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <TokenSelector
              selectedToken={token1 || tokenList[1]}
              onSelect={(token) => {
                setSelectedToken1Address(token.address)
                setToken1(token)
              }}
              label="选择 Token1"
              otherToken={token0 || tokenList[0]}
            />
          </div>
        </div>
        {/* 交易费率 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-muted-foreground">
            交易费率
          </label>
          <div className="flex space-x-2">
            {FEE_TIERS.map((feeValue) => (
              <button
                key={feeValue}
                className={`flex-1 px-3 py-2 rounded transition-colors ${
                  selectedFee === feeValue
                    ? 'bg-primary text-white'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={() => setSelectedFee(feeValue)}
              >
                {feeValue / 10000}%
              </button>
            ))}
          </div>
        </div>
        {/* 链 ID */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 text-muted-foreground">
            链 ID
          </label>
          <input
            type="text"
            value={selectedChainId}
            onChange={(e) =>
              setSelectedChainId(parseInt(e.target.value) || 11155111)
            }
            placeholder="例如：11155111"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="text-xs text-muted-foreground">
            当前: Sepolia (11155111)
          </div>
        </div>
        {/* 搜索按钮 */}
        <button
          onClick={searchPool}
          className={cn(
            'w-full py-4 rounded-lg font-medium text-lg transition-colors',
            isCheckingPool
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
        >
          {isCheckingPool ? '搜索中' : '搜索资金池'}
        </button>
      </div>
    </>
  )

  const renderNotFound = () => (
    <div className="text-center py-10">
      <p className="text-lg text-card-foreground mb-4">未找到匹配的流动性池</p>
      <button
        onClick={createNewPool}
        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
      >
        创建新池
      </button>
    </div>
  )

  const renderAddLiquidity = () => (
    <>
      {/* 池子状态 */}
      <div className="mb-4 p-3 bg-muted rounded-lg">
        <div className="flex justify-between item-center">
          <span className="text-sm text-muted-foreground">池子状态</span>
          <span
            className={cn(
              'text-sm font-medium',
              poolExists
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-orange-400'
            )}
          >
            {poolExists ? '已存在' : '未创建'}
          </span>
        </div>
        {currentPool && (
          <div className="mt-1 text-sxs text-muted-foreground">
            池子地址:{' '}
            <span className="text-foreground">
              {shortenAddress(currentPool)}
            </span>
          </div>
        )}
      </div>
      {/* 费率 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">费率</span>
        </div>
        <div className="flex space-x-2">
          {FEE_TIERS.map((feeValue) => (
            <button
              key={feeValue}
              className={`flex-1 px-3 py-2 rounded transition-colors ${
                selectedFee === feeValue
                  ? 'bg-primary text-white'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {feeValue / 10000}%
            </button>
          ))}
        </div>
      </div>
      {/* 代币交换 */}
      {/* Token0 */}
      {!poolExists && token0 && token1 && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-foreground">
                初始价格
              </span>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="text-xs text-muted-foreground mb-2">
            设置 {token0.symbol} 与 {token1.symbol} 之间的初始价格比率
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              1 {token0.symbol} =
            </span>
            <input
              type="text"
              value={initialPrice}
              onChange={(e) => handleInitialPriceChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">
              {token1.symbol}
            </span>
          </div>
          {/* TODO: priceError */}
        </div>
      )}

      {/* token0 是否是原生代币 */}
      {(token0 && isNativeTokenAddress(token0.address)) ||
      (token1 && isNativeTokenAddress(token1.address)) ? (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          如果你选择了原生 `ETH`，本页会先引导你把所需数量包装成
          `WETH`，然后再执行授权和添加流动性
        </div>
      ) : null}

      {/* TODO: 交易失败提示、是否有余额 */}

      {/* Token0 */}
      {token0 && token1 && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-sm text-muted-foreground">代币 0</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  余额:
                  {token0 && isNativeTokenAddress(token0.address)
                    ? nativeBalance
                      ? formatTokenAmount(nativeBalance.formatted)
                      : '0'
                    : token0Balance
                      ? formatTokenAmount(token0Balance.formatted)
                      : '0'}
                </span>
                {(token0 && isNativeTokenAddress(token0.address)
                  ? nativeBalance
                  : token0Balance) &&
                  parseFloat(
                    (token0 && isNativeTokenAddress(token0.address)
                      ? nativeBalance
                      : token0Balance)!.formatted
                  ) > 0 && (
                    <button className="text-sm text-primary hover:text-primary/80">
                      最大
                    </button>
                  )}
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
              <input
                type="text"
                value={amount0}
                onChange={(e) => handleAmount0Change(e.target.value)}
                placeholder="0"
                className="text-2xl font-medium flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="px-3 py-2 bg-secondary rounded-lg">
                <span className="font-medium text-secondary-foreground">
                  {token0.symbol}
                </span>
              </div>
            </div>
          </div>

          {/* swap arrow */}
          <div className="flex items-center justify-center my-4">
            <button
              onClick={handleSwapTokens}
              className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <ArrowUpDown className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          {/* Token1 */}
          <div className="mb-4">
            <div className="flex items-center justify-between space-x-2">
              <span className="text-sm text-muted-foreground">代币 1</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  余额:
                  {token1 && isNativeTokenAddress(token1.address)
                    ? nativeBalance
                      ? formatTokenAmount(nativeBalance.formatted)
                      : '0'
                    : token1Balance
                      ? formatTokenAmount(token1Balance.formatted)
                      : '0'}
                </span>
                {(token1 && isNativeTokenAddress(token1.address)
                  ? nativeBalance
                  : token1Balance) &&
                  parseFloat(
                    (token1 && isNativeTokenAddress(token1.address)
                      ? nativeBalance
                      : token1Balance)!.formatted
                  ) > 0 && (
                    <button className="text-sm text-primary hover:text-primary/80">
                      最大
                    </button>
                  )}
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
              <input
                type="text"
                value={amount1}
                onChange={(e) => handleAmount1Change(e.target.value)}
                placeholder="0"
                className="text-2xl font-medium flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="px-3 py-2 bg-secondary rounded-lg">
                <span className="font-medium text-secondary-foreground">
                  {token1.symbol}
                </span>
              </div>
            </div>
            {/* TODO 计算有误页面提示 */}
          </div>

          {/* Action Buttons */}
          {!isConnected ? (
            // 未连接钱包
            <button
              disabled
              className="w-full py-4 rounded-lg font-medium text-lg bg-muted text-muted-foreground cursor-not-allowed"
            >
              请先连接钱包
            </button>
          ) : needsWrap0 ? (
            // 是否需要转换链上值
            <button
              onClick={() => wrapToken(token0, amount0, token0Balance?.value)}
              disabled={
                isPending || isConfirming || hasInsuffientBalance0 || !amount0
              }
              className={cn(
                'w-full py-4 rounded-lg font-medium text-lg transtion-colors',
                isPending || isConfirming || hasInsuffientBalance0 || !amount0
                  ? 'bg-muted text-muted-foreground cursor-not-allow'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              {isPending || isConfirming ? '包装中...' : '先将 ETH 包装为 WETH'}
            </button>
          ) : needsWrap1 ? (
            // 是否需要转换链上值
            <button
              onClick={() => wrapToken(token1, amount1, token1Balance?.value)}
              disabled={
                isPending || isConfirming || hasInsuffientBalance1 || !amount1
              }
              className={cn(
                'w-full py-4 rounded-lg font-medium text-lg transtion-colors',
                isPending || isConfirming || hasInsuffientBalance1 || !amount1
                  ? 'bg-muted text-muted-foreground cursor-not-allow'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              {isPending || isConfirming ? '包装中...' : '先将 ETH 包装为 WETH'}
            </button>
          ) : needsApproval0 ? (
            // 需要授权 token0
            <button></button>
          ) : needsApproval1 ? (
            // 需要授权 token1
            <button></button>
          ) : (
            // 一切准备就绪，可以添加流动性了
            <button></button>
          )}
        </>
      )}
    </>
  )

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-card-foreground">
            添加流动性
          </h1>
          {step !== 'select' && (
            <button
              onClick={backToSelect}
              className="text-sm text-primary hover:text-primary/80"
            >
              重新选择
            </button>
          )}
        </div>
        {/* Transaction Status */}
        {/* Wallet Status */}
        {/* 根据步骤渲染不同界面 */}
        {step === 'select' && renderSelect()}
        {step === 'searching' && (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-center py-10">正在搜索流动性池...</p>
          </div>
        )}
        {step === 'notFound' && renderNotFound()}
        {step === 'addLiquidity' && renderAddLiquidity()}
      </div>
    </div>
  )
}
