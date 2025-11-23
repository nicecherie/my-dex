'use client'

import Link from 'next/link'
import { ConnectWalletButton } from './ConnectWalletButton'
import { ThemeToggle } from './ThemeToggle'

export default function Header() {
  return (
    <header className="bg-background dark:bg-foreground border-b border-border shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div
                className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600
                rounded-lg flex items-center justify-center"
              >
                <span className="text-sm font-bold text-white">MN</span>
              </div>
              <span className="text-xl font-bold text-foreground dark:text-background">
                MetaNodeSwap
              </span>
            </Link>
          </div>
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </nav>
    </header>
  )
}
