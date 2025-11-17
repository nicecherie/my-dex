import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetBrainsMono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'MySwap',
  description: '基于区块链的去中心化代币交换平台'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetBrainsMono.variable}
        antialiased bg-background text-foreground min-h-screen font-sans
      `}
      >
        {children}
      </body>
    </html>
  )
}
