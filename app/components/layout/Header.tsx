'use client'

import { ThemeToggle } from './ThemeToggle'

export default function Header() {
  return (
    <header className="bg-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dex UI
        </h1>
        <ThemeToggle />
      </div>
    </header>
  )
}
