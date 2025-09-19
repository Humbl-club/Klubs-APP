import React, { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

type FeatureToggle = { feature_key: string; enabled: boolean }
const ALL_FEATURES = ['events','social','challenges','commerce']

export const MobileFeatureToggles: React.FC = () => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      if (!orgId) return
      setLoading(true)
      const { data } = await supabase
        .from('organization_features')
        .select('feature_key, enabled')
        .eq('organization_id', orgId)
      const map: Record<string, boolean> = {}
      for (const f of (data || [])) map[f.feature_key] = !!f.enabled
      // ensure all keys present
      for (const k of ALL_FEATURES) if (map[k] === undefined) map[k] = false
      setToggles(map)
      setLoading(false)
    })()
  }, [orgId])

  const toggle = async (key: string, value: boolean) => {
    if (!orgId) return
    setToggles(prev => ({ ...prev, [key]: value }))
    await supabase.from('organization_features').upsert({ organization_id: orgId, feature_key: key, enabled: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ALL_FEATURES.map(k => (
          <div key={k} className="flex items-center justify-between">
            <Label className="capitalize">{k}</Label>
            <Switch checked={!!toggles[k]} onCheckedChange={(v)=>toggle(k, v)} disabled={loading} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default MobileFeatureToggles

