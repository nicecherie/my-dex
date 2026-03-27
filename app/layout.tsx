import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import Header from '@/components/layout/Header'
import { Web3Provider } from '@/components/providers/Web3Provider'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetBrainsMono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'CherieSwap',
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
        className={` ${inter.variable} ${jetBrainsMono.variable}
        antialiased text-foreground min-h-screen font-sans
      `}
      >
        <ThemeProvider defaultTheme="system" storageKey="dex-ui-theme">
          <Web3Provider>
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-gray-100">
              <Header />
              <main className="container mx-auto px-4 py-8">{children}</main>
            </div>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
