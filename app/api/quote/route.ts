import { CONTRACTS, TOKENS } from '@/lib/constants'
import { POOL_MANAGER_ABI, SWAP_ROUTER_ABI } from '@/lib/contracts'
import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

// 创建公共客户端连接到Sepolia网络
const publicClient = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL!),
  chain: sepolia
})

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json()
    let { tokenIn, tokenOut } = body
    const { amountIn, sqrtPriceLimitX96 } = body
    let indexPath = body.indexPath || [0]

    // 异常判断
    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    //  处理原生ETH地址 - 使用WETH代替
    if (tokenIn === TOKENS.ETH.address) {
      tokenIn = TOKENS.ETH.wrappedAddress
    }
    if (tokenOut === TOKENS.ETH.address) {
      tokenOut = TOKENS.ETH.wrappedAddress
    }

    // 获取可用池子列表来确定正确的indexPath
    try {
      // 获取池子列表
      const poolData = await publicClient.readContract({
        address: CONTRACTS.POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'getAllPools'
      })
      console.log('池子列表:', poolData)

      // 找到匹配的池子
      const matchingPool = poolData.find((p) => {
        const t0 = p.token0.toLocaleLowerCase()
        const t1 = p.token1.toLocaleLowerCase()
        const tIn = tokenIn.toLocaleLowerCase()
        const tOut = tokenOut.toLocaleLowerCase()

        return (t0 === tIn && t1 === tOut) || (t0 === tOut && t1 === tIn)
      })

      if (matchingPool) {
        console.log(`找到匹配的池子，索引：${matchingPool.index}`)
        indexPath = [matchingPool.index]
      } else {
        // 池子列表为空或者没有匹配的池子
        console.log('没有匹配的池子, 返回模拟数据')

        // 解析输入金额并计算模拟输出
        const inAmount = BigInt(amountIn)
        const simulatedAmountOut = (inAmount * BigInt(98)) / BigInt(100) // 假设有2%的滑点

        return NextResponse.json({
          success: true,
          amountOut: simulatedAmountOut.toString(),
          priceImpact: '0.5',
          simulated: true
        })
      }
    } catch (poolError) {
      console.error('获取池子列表失败:', poolError)

      // 解析输入金额并计算模拟输出
      const inAmount = BigInt(amountIn)
      const simulatedAmountOut = (inAmount * BigInt(98)) / BigInt(100) // 假设有2%的滑点
      return NextResponse.json({
        success: true,
        amountOut: simulatedAmountOut.toString(),
        priceImpact: '0.5',
        simulated: true
      })
    }

    // 调用合约的 quoteExactInput 方法
    const quoteParams = {
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      indexPath,
      amountIn,
      sqrtPriceLimitX96: sqrtPriceLimitX96 || '0'
    }

    console.log('调用合约 quoteExactInput，参数：', JSON.stringify(quoteParams))
    try {
      const amountOut = (await publicClient.readContract({
        address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
        abi: SWAP_ROUTER_ABI,
        functionName: 'quoteExactInput',
        args: [quoteParams]
      })) as BigInt
    } catch (quoteError: unknown) {
      console.error('调用合约 quoteExactInput 失败：', quoteError)

      // 合约调用失败， 返回模拟数据
      // 解析输入金额并计算模拟输出
      const inAmount = BigInt(amountIn)
      const simulatedAmountOut = (inAmount * BigInt(98)) / BigInt(100) // 假设有2%的滑点

      // 提取错误信息
      let errorMessage = '获取预估价格失败'
      if (
        quoteError &&
        typeof quoteError === 'object' &&
        'shortMessage' in quoteError
      ) {
        errorMessage = String(quoteError.shortMessage)
      }

      return NextResponse.json({
        success: true,
        amountOut: simulatedAmountOut.toString(),
        priceImpact: '0.5',
        simulated: true,
        error: errorMessage
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取报价失败'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
