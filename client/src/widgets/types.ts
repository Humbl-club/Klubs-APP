export type WidgetKey =
  | 'featured-event'
  | 'upcoming-events'
  | 'steps'
  | 'promo'
  | 'quick-actions'
  | 'points'
  | 'community-highlights'
  | 'mini-calendar'
  | 'leaderboard'
  | 'store-carousel'
  | 'product-grid'
  | 'featured-product'
  | 'offer-banner'
  | 'product-grid'
  | 'mini-cart'

export interface WidgetInstance {
  id: string
  key: WidgetKey
  title?: string
  props?: Record<string, any>
  layout?: {
    w?: number // grid columns to span (1-4 on mobile)
    h?: number // grid rows to span (1-3 on mobile)
  }
}

export interface OrgLayout {
  organization_id: string
  instances: WidgetInstance[]
  version?: number
  status?: 'published' | 'draft'
  updated_at?: string
}

export interface WidgetMeta {
  key: WidgetKey
  name: string
  icon: any
  description?: string
  featureFlag?: string
  defaultProps?: Record<string, any>
}
