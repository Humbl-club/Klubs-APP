import React from 'react'
import { useProfileData } from '@/hooks/useProfileData'

const PointsBlock: React.FC = () => {
  const { profile } = useProfileData()
  const pts = profile?.available_loyalty_points ?? 0
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-muted-foreground">Available Points</div>
        <div className="text-2xl font-semibold">{pts}</div>
      </div>
    </div>
  )
}

export default PointsBlock

