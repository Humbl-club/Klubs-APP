import { supabase } from '@/integrations/supabase/client'
import type { OrgLayout, WidgetInstance } from '@/widgets/types'

export const OrgLayoutService = {
  async fetchPublished(orgId: string): Promise<OrgLayout | null> {
    try {
      const { data, error } = await supabase
        .from('organization_layouts')
        .select('layout_json')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return null
      const layout = (data?.layout_json || null) as OrgLayout | null
      return layout
    } catch {
      return null
    }
  },
  async savePublished(orgId: string, instances: WidgetInstance[], userId?: string): Promise<boolean> {
    try {
      const layout: OrgLayout = { organization_id: orgId, instances, status: 'published' }
      const { error } = await supabase
        .from('organization_layouts')
        .upsert({ organization_id: orgId, layout_json: layout }, { onConflict: 'organization_id' })
      if (!error) {
        // record a version if versions table exists
        await supabase.from('organization_layout_versions').insert({ organization_id: orgId, status: 'published', layout_json: layout, created_by: userId || null })
      }
      return !error
    } catch {
      return false
    }
  },
  async saveDraft(orgId: string, instances: WidgetInstance[], userId?: string): Promise<boolean> {
    try {
      const layout: OrgLayout = { organization_id: orgId, instances, status: 'draft' }
      const { error } = await supabase.from('organization_layout_versions').insert({ organization_id: orgId, status: 'draft', layout_json: layout, created_by: userId || null })
      return !error
    } catch { return false }
  },
  async listVersions(orgId: string, limit = 5): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('organization_layout_versions')
        .select('id, status, created_at, created_by')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit)
      return data || []
    } catch { return [] }
  },
  async fetchVersion(orgId: string, versionId: number): Promise<OrgLayout | null> {
    try {
      const { data, error } = await supabase
        .from('organization_layout_versions')
        .select('layout_json')
        .eq('organization_id', orgId)
        .eq('id', versionId)
        .maybeSingle()
      if (error) return null
      return (data?.layout_json || null) as OrgLayout | null
    } catch { return null }
  },
  async rollbackTo(orgId: string, versionId: number, userId?: string): Promise<boolean> {
    try {
      const v = await this.fetchVersion(orgId, versionId)
      if (!v) return false
      return this.savePublished(orgId, v.instances, userId)
    } catch { return false }
  },
  async fetchUserOverride(orgId: string, userId: string): Promise<OrgLayout | null> {
    try {
      const { data } = await supabase
        .from('user_layout_overrides')
        .select('layout_json')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .maybeSingle()
      return (data?.layout_json || null) as OrgLayout | null
    } catch { return null }
  },
  async saveUserOverride(orgId: string, userId: string, instances: WidgetInstance[]): Promise<boolean> {
    try {
      const layout: OrgLayout = { organization_id: orgId, instances, status: 'published' }
      const { error } = await supabase
        .from('user_layout_overrides')
        .upsert({ organization_id: orgId, user_id: userId, layout_json: layout })
      return !error
    } catch { return false }
  },
  async resetUserOverride(orgId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_layout_overrides')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId)
      return !error
    } catch { return false }
  }
}
