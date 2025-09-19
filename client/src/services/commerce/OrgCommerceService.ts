import { supabase } from '@/integrations/supabase/client'

export type OrgCommerceConfig = {
  organization_id: string
  shop_domain: string
  storefront_access_token: string
  default_collection_handle?: string | null
  currency?: string | null
  enabled: boolean
}

export const OrgCommerceService = {
  async get(orgId: string): Promise<OrgCommerceConfig | null> {
    const { data } = await supabase
      .from('organization_commerce')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()
    return (data as any) || null
  },
  async upsert(cfg: OrgCommerceConfig): Promise<boolean> {
    const { error } = await supabase
      .from('organization_commerce')
      .upsert(cfg as any, { onConflict: 'organization_id' })
    return !error
  }
}

