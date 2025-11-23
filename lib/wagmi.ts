import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { sepolia } from 'wagmi/chains'

const projectId = 'c51dd74a20c630fec4520d6a95310f6d'

export const config = getDefaultConfig({
  appName: 'MetaNodeSwap',
  projectId: projectId,
  chains: [sepolia],
  transports: { [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) },
  ssr: true // If your dApp uses server side rendering (SSR)
})

export { sepolia }
