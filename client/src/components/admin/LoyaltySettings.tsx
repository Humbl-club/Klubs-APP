import React, { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

export const LoyaltySettings: React.FC = () => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [provider, setProvider] = useState<'smile'|'yotpo'|'loyaltylion'|'custom'>('smile')
  const [enabled, setEnabled] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({ api_key: '', api_secret: '', base_url: '' })
  const [loading, setLoading] = useState(false)
  useEffect(() => { (async () => {
    if (!orgId) return
    const { data } = await supabase.from('organization_loyalty_integrations').select('*').eq('organization_id', orgId).maybeSingle()
    if (data) {
      setProvider(data.provider)
      setEnabled(!!data.enabled)
      setSettings({ ...(data.settings || {}) })
    }
  })() }, [orgId])

  const save = async () => {
    if (!orgId) return
    setLoading(true)
    await supabase.from('organization_loyalty_integrations').upsert({ organization_id: orgId, provider, settings, enabled })
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enabled</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v)=>setProvider(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="smile">Smile.io</SelectItem>
              <SelectItem value="yotpo">Yotpo</SelectItem>
              <SelectItem value="loyaltylion">LoyaltyLion</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>API Key</Label>
            <Input value={settings.api_key || ''} onChange={(e)=>setSettings(s=>({ ...s, api_key: e.target.value }))} />
          </div>
          <div>
            <Label>API Secret</Label>
            <Input value={settings.api_secret || ''} onChange={(e)=>setSettings(s=>({ ...s, api_secret: e.target.value }))} />
          </div>
          <div>
            <Label>Base URL</Label>
            <Input value={settings.base_url || ''} onChange={(e)=>setSettings(s=>({ ...s, base_url: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default LoyaltySettings

