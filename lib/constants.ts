// 合约地址配置 --updated at 2025-11-16
export const CONTRACTS = {
  POOL_MANAGER: '0x8DB50b273eEE7A9dbE709C3af926f56A3D9A497D',
  POSITION_MANAGER: '0x47E41cc038F60a2CBD6CB24eb26F351BC8b023AF',
  SWAP_ROUTER: '0x075a343dA3ef0c1eA5779FCB37671D3219353BFF',
  META_NODE_MANAGER: '0x5dFA0732f07f8e2105e511596A3E297011E78401',
  LIQUIDITY_MANAGER: '0x47E41cc038F60a2CBD6CB24eb26F351BC8b023AF' // 使用Position Manager作为流动性管理器
} as const

// 测试代币地址
export const TOKENS = {
  ETH: {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // 原生ETH的特殊地址
    // address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // 原生ETH的特殊地址
    wrappedAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH 地址
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true
  },
  MNTokenA: {
    address: '0xeAdC775e223c4aD904d6C891d9dDa21C34709280', // 我的MetaNode
    symbol: 'MNA',
    name: 'MetaNode Token A',
    decimals: 18
  },
  MNTokenB: {
    address: '0x5A4eA3a013D42Cfd1B1609d19f6eA998EeE06D30',
    symbol: 'MNB',
    name: 'MetaNode Token B',
    decimals: 18
  },
  MNTokenC: {
    address: '0x86B5df6FF459854ca91318274E47F4eEE245CF28',
    symbol: 'MNC',
    name: 'MetaNode Token C',
    decimals: 18
  },
  MNTokenD: {
    address: '0x9bEd3abf7b73a7c90877313F4B3624D362aC4EE2',
    symbol: 'MNY',
    name: 'YY Token',
    decimals: 18
  }
} as const

export const ETH_SPECIAL_ADDRESS = TOKENS.ETH.address

export function isNativeTokenAddress(address?: string | null): boolean {
  return (
    !!address && address.toLowerCase() === ETH_SPECIAL_ADDRESS.toLowerCase()
  )
}

export function toChainTokenAddress(address: string): string {
  return isNativeTokenAddress(address) ? TOKENS.ETH.wrappedAddress : address
}

export function getTokenByAddress(address?: string | null) {
  if (!address) return undefined

  return Object.values(TOKENS).find((token) => {
    if (token.address.toLowerCase() === address.toLowerCase()) {
      return true
    }

    return (
      'wrappedAddress' in token &&
      typeof token.wrappedAddress === 'string' &&
      token.wrappedAddress.toLowerCase() === address.toLowerCase()
    )
  })
}

// 网络配置
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia
  name: 'Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  blockExplorer: 'https://sepolia.etherscan.io'
} as const

// 默认滑点配置
export const DEFAULT_SLIPPAGE = 0.5 // 0.5%

// 费率选项
export const FEE_TIERS = [500, 3000, 10000] // 0.05%, 0.3%, 1%
