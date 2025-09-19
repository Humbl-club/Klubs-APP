import React from 'react'
import { WalkingChallengeWidget } from '@/components/wellness/WalkingChallengeWidget'

const StepsBlock: React.FC<{ timeframe?: 'week'|'month' }>= () => {
  return (
    <div className="space-y-2">
      <WalkingChallengeWidget />
    </div>
  )
}

export default StepsBlock

