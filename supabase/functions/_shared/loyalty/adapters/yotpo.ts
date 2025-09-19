import type { LoyaltyAdapter, ProviderSettings } from './index.ts'

export const yotpoAdapter: LoyaltyAdapter = {
  async getPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }): Promise<number> {
    // TODO: Implement Yotpo Loyalty API using settings + link
    return 0
  },
  async addPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }, _delta: number, _reason?: string) {
    // TODO: Implement Yotpo add/redeem points
    return
  }
}

