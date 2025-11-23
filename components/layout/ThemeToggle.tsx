'use client'

import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        aria-label="切换到亮色模式"
        className={cn(
          'p-2 rounded-md transition-colors',
          theme === 'light'
            ? 'bg-white shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-800'
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        aria-label="切换到暗黑模式"
        className={cn(
          'p-2 rounded-md transition-colors',
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-sm'
            : 'hover:bg-gray-200 dark:hover:bg-gray-800'
        )}
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  )
}
