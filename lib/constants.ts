// 合约地址配置 --updated at 2025-11-16
export const CONTRACTS = {
  POOL_MANAGER: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  POSITION_MANAGER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  SWAP_ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  LIQUIDITY_MANAGER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' // 使用Position Manager作为流动性管理器
} as const

// 测试代币地址
export const TOKENS = {
  ETH: {
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // 原生ETH的特殊地址
    wrappedAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH 地址
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true
  },
  MNTokenA: {
    address: '0xeAdC775e223c4aD904d6C891d9dDa21C34709280',
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
