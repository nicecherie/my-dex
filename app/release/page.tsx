'use client'
import { TOKENS } from '@/lib/constants'
import {
  RELEASE_CONTRACT_ABI,
  RELEASE_CONTRACT_BYTECODE
} from '@/lib/release-contract'
import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle, Clock, Rocket, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWalletClient
} from 'wagmi'

export default function Release() {
  // 获取用户钱包信息
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  // 部署状态
  const [name, setName] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('')
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deployedHash, setDeployedHash] = useState<`0x${string}` | undefined>(
    undefined
  )

  const router = useRouter()

  // 部署交易确认
  const {
    isLoading: isDeployconfirming,
    isSuccess: isDeployconfirmed,
    data: deployReceipt
  } = useWaitForTransactionReceipt({ hash: deployedHash })

  // 铸币合约交互
  useEffect(() => {
    if (deployReceipt?.contractAddress) {
      setDeployedAddress(deployReceipt.contractAddress)
    }
  }, [deployReceipt])

  const isDeploying =
    isDeployconfirming ||
    (!isDeployconfirmed && !!deployedHash && !deployReceipt)

  const handleDeploy = async () => {
    if (!walletClient || !address || !name || !symbol) return
    try {
      // 1. 部署合约
      const hash = await walletClient.deployContract({
        abi: RELEASE_CONTRACT_ABI,
        bytecode: RELEASE_CONTRACT_BYTECODE,
        args: [name, symbol],
        gas: BigInt(3000000) // 设置足够的 Gas 限额
      })
      setDeployedHash(hash)
      console.log('部署交易哈希:', hash)
    } catch (error) {
      console.error('部署合约失败:', error)
    }
  }

  const handleAddTokenToWallet = async () => {
    if (!walletClient || !deployedAddress) return
    try {
      await walletClient.watchAsset({
        type: 'ERC20',
        options: {
          address: deployedAddress as `0x${string}`,
          symbol: symbol.slice(0, 11),
          decimals: 18
        }
      })
    } catch (error) {
      console.error('添加代币到钱包失败:', error)
      alert('添加代币到钱包失败，请确保你的钱包支持该功能并重试')
    }
  }

  const handleAddLiquidity = () => {
    if (!deployedAddress) return
    // 跳转到添加流动性页面，并传递合约地址作为查询参数
    router.push(
      `/liquidity?token0=${deployedAddress}&token1=${TOKENS.ETH.address}`
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">铸造代币</h2>
        <p className="text-gray-600">
          在 Sepolia 测试网上铸造你自己的 ERC20 代币
        </p>
      </div>
      <div className="bg-white rounded-2xl border shadow-lg p-6 space-y-8">
        {/* 第一步：部署合约 */}
        <div
          className={cn(
            'space-y-4',
            deployedAddress && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex items-center space-x-2 mb-2">
            <div
              className={cn(
                'w-6 h-6  text-white rounded-full flex items-center justify-center text-sm font-bold',
                deployedAddress ? 'bg-green-500' : 'bg-blue-600'
              )}
            >
              1
            </div>
            <h3 className="text-lg font-semibold">部署合约</h3>
          </div>
          {/* 添加两个输入框 */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                代币名称
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：MyToken"
              />
            </div>
            <div>
              <label
                htmlFor="symbol"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                代币符号
              </label>
              <input
                type="text"
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：MTK"
              />
            </div>
          </div>
          {/* 未部署合约时，显示按钮，根据部署状态做区分 */}
          {!deployedAddress && (
            <>
              <button
                onClick={handleDeploy}
                disabled={!name || !symbol || !isConnected || isDeploying}
                className={cn(
                  'w-full bg-blue-600 text-white py-4 rounded-lg transition-colors flex items-center justify-center space-x-2',
                  !name || !symbol || !isConnected || isDeploying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {isDeploying ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    <span>部署中...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>部署合约</span>
                  </>
                )}
              </button>
            </>
          )}

          {deployedHash && !deployedAddress && (
            <div className="p-3 bg-blue-500 text-blue-700 text-sm rounded-lg flex items-center">
              <Clock className="w-4 h-4 animate-spin mr-2" />
              <span>交易已发送，等待确认...</span>
            </div>
          )}
        </div>
        {/* 第二步：铸造代币完成 */}
        {deployedAddress && (
          <div className="space-y-4 pt-6 border-t animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-700 mb-2">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">合约部署成功</span>
              </div>
              <div className="text-sm text-green-600 space-y-3">
                <div className="space-y-1">
                  <p>合约地址: {deployedAddress}</p>
                  <p>已自动为您铸造 100,000 {symbol}。</p>
                </div>
                <button
                  onClick={handleAddTokenToWallet}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-green-200 hover:bg-green-50 text-green-700 rounded-md transition-colors text-sm font-medium shadow-sm"
                >
                  <Wallet className="w-4 h-4 mr-1.5" />
                  添加到钱包
                </button>
              </div>
            </div>

            <button
              onClick={handleAddLiquidity}
              className="w-full py-4 rounded-lg font-medium text-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center space-x-2"
            >
              <span>去添加流动性</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
