'use client'

import { NetworkChecker } from '@/components/NetworkChecker'
import { CreatePoolModal } from '@/components/pools/CreatePoolModal'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function PoolsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  return (
    <div>
      <NetworkChecker>
        <div className="flex justify-between items-center mb-6">
          <h2>所有流动性池</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary flex items-center gap-2 text-white px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建新池
          </button>
        </div>

        <CreatePoolModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </NetworkChecker>
    </div>
  )
}
