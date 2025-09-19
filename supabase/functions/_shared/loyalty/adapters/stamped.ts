import type { LoyaltyAdapter, ProviderSettings } from './index.ts'

export const stampedAdapter: LoyaltyAdapter = {
  async getPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }): Promise<number> {
    // TODO: Implement Stamped loyalty points API
    return 0
  },
  async addPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }, _delta: number, _reason?: string) {
    // TODO: Implement Stamped earn/spend
    return
  }
}

