import type { LoyaltyAdapter, ProviderSettings } from './index.ts'

export const riseAdapter: LoyaltyAdapter = {
  async getPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }): Promise<number> {
    // TODO: Implement Rise.ai balance lookup (gift card/loyalty balance)
    return 0
  },
  async addPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }, _delta: number, _reason?: string) {
    // TODO: Implement Rise.ai adjustment
    return
  }
}

