'use client'
import { useCreatePool } from '@/hooks/useCreatePool'
import { TOKENS } from '@/lib/constants'
import { AlertCircle, CheckCircle, ExternalLink, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

interface CreatePoolModalProps {
  open: boolean
  onClose: () => void
}
export function CreatePoolModal({ open, onClose }: CreatePoolModalProps) {
  const [token0, setToken0] = useState<string>('')
  const [token1, setToken1] = useState<string>('')
  const [fee, setFee] = useState('3000')
  const { createPool, isCreating, isConfirmed, txHash, error } = useCreatePool()
  const { isConnected } = useAccount()
  const tokenList = Object.values(TOKENS)
  const feeOptions = [
    { value: '500', label: '0.05%', description: '稳定币对' },
    { value: '3000', label: '0.3%', description: '标准' },
    { value: '10000', label: '1%', description: '高风险' }
  ]

  // 确认交易后，关闭模态框并重置状态
  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => {
        onClose()
        setToken0('')
        setToken1('')
        setFee('3000')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isConfirmed, onClose])

  const handleCreatePool = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }
    if (!token0 || !token1) {
      alert('请选择两个代币')
      return
    }
    if (token0 === token1) {
      alert('请选择不同的代币')
      return
    }
    try {
      await createPool({
        token0,
        token1,
        fee: parseInt(fee)
      })
    } catch (error) {
      console.log('创建池子失败', error)
    }
  }

  const getButtonText = () => {
    if (!isConnected) return '连接钱包'
    if (isCreating) return '创建中...'
    if (isConfirmed) return '创建成功!'
    return '创建池子'
  }

  const getButtonIcon = () => {
    if (isCreating) {
      return (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )
    }
    if (isConfirmed) {
      return <CheckCircle className="w-4 h-4" />
    }
    return <Plus className="w-4 h-4" />
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={!isCreating ? onClose : undefined}
      />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">创建新的流动性池</h3>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 p-6">
          {/* 交易状态展示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <div className="font-medium text-red-800">创建失败</div>
                  <div className="text-sm text-red-600 mt-1">
                    {error.message || '未知错误'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isConfirmed && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div className="flex-1">
                  <div className="font-medium text-green-800">
                    池子创建成功！
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:text-green-800 flex items-center mt-1"
                  >
                    查看交易详情 <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                <div>
                  <div className="font-medium text-blue-800">
                    正在创建池子...
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    请在钱包中确认交易
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* form */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              第一个代币
            </label>
            <select
              value={token0}
              onChange={(e) => setToken0(e.target.value)}
              disabled={isCreating}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">选择代币</option>
              {tokenList.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}-{token.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              第二个代币
            </label>
            <select
              value={token1}
              onChange={(e) => setToken1(e.target.value)}
              disabled={isCreating}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">选择代币</option>
              {tokenList
                .filter((token) => token.address !== token0)
                .map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}-{token.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交易手续费
            </label>
            <div className="space-y-2">
              {feeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    isCreating ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="fee"
                    value={option.value}
                    checked={fee === option.value}
                    onChange={() => setFee(option.value)}
                    disabled={isCreating}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 创建信息预览 */}
          {token0 && token1 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">创建的交易对</h4>
              <div className="flex items-center justify-between">
                <span>
                  {tokenList.find((t) => t.address === token0)?.symbol} /{' '}
                  {tokenList.find((t) => t.address === token1)?.symbol}
                </span>
                <span className="text-xs text-gray-600">
                  费率： {feeOptions.find((f) => f.value === fee)?.label}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                初始价格比率： 1:1 (可在创建后通过添加流动性调整)
              </div>
            </div>
          )}
        </div>
        {/* actions */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '创建中...' : '取消'}
          </button>
          <button
            onClick={handleCreatePool}
            className="flex-1 px-4 py-2 bg-primary/90 rounded-lg text-white hover:bg-primary/100 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {getButtonIcon()}
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  )
}
