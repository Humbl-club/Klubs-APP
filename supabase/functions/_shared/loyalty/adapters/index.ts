export type Provider = 'smile' | 'yotpo' | 'loyaltylion' | 'rise' | 'stamped' | 'custom'

export interface ProviderSettings { api_key?: string; api_secret?: string; base_url?: string }

export interface LoyaltyAdapter {
  getPoints: (
    settings: ProviderSettings,
    link: { email?: string; provider_customer_id?: string }
  ) => Promise<number>
  addPoints: (
    settings: ProviderSettings,
    link: { email?: string; provider_customer_id?: string },
    delta: number,
    reason?: string
  ) => Promise<void>
}

import { smileAdapter } from './smile.ts'
import { yotpoAdapter } from './yotpo.ts'
import { loyaltyLionAdapter } from './loyaltylion.ts'
import { riseAdapter } from './rise.ts'
import { stampedAdapter } from './stamped.ts'

export function resolveAdapter(provider: Provider): LoyaltyAdapter {
  switch (provider) {
    case 'smile':
      return smileAdapter
    case 'yotpo':
      return yotpoAdapter
    case 'loyaltylion':
      return loyaltyLionAdapter
    case 'rise':
      return riseAdapter
    case 'stamped':
      return stampedAdapter
    default:
      return {
        async getPoints() {
          return 0
        },
        async addPoints() {
          return
        },
      }
  }
}

