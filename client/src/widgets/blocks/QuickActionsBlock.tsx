import React from 'react'
import { Button } from '@/components/ui/button'
import { QrCode, Plus, Users, Calendar } from 'lucide-react'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { useAuth } from '@/components/auth/AuthProvider'

const QuickActionsBlock: React.FC<{ items?: string[] }> = ({ items = ['scan-qr','events'] }) => {
  const feedback = useHapticFeedback()
  const { isAdmin } = useAuth()

  const go = (href: string) => () => { feedback.tap(); window.location.href = href }

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.includes('scan-qr') && (
        <Button variant="secondary" className="flex flex-col h-16" onClick={go('/qr-scanner')}>
          <QrCode className="w-4 h-4 mb-1" />
          <span className="text-xs">Scan QR</span>
        </Button>
      )}
      {items.includes('events') && (
        <Button variant="secondary" className="flex flex-col h-16" onClick={go('/events')}>
          <Calendar className="w-4 h-4 mb-1" />
          <span className="text-xs">Events</span>
        </Button>
      )}
      {isAdmin && items.includes('create-event') && (
        <Button variant="secondary" className="flex flex-col h-16" onClick={go('/events')}>
          <Plus className="w-4 h-4 mb-1" />
          <span className="text-xs">Create</span>
        </Button>
      )}
      {items.includes('invite') && (
        <Button variant="secondary" className="flex flex-col h-16" onClick={go('/admin/organization')}>
          <Users className="w-4 h-4 mb-1" />
          <span className="text-xs">Invite</span>
        </Button>
      )}
    </div>
  )
}

export default QuickActionsBlock

