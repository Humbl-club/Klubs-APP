import type { LoyaltyAdapter, ProviderSettings } from './index.ts'

export const smileAdapter: LoyaltyAdapter = {
  async getPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }): Promise<number> {
    // TODO: Implement Smile.io API call using settings.base_url + settings.api_key
    // Example: GET /customers?email=... then read points_balance
    return 0
  },
  async addPoints(_settings: ProviderSettings, _link: { email?: string; provider_customer_id?: string }, _delta: number, _reason?: string) {
    // TODO: Implement Smile.io earn/spend endpoint
    return
  }
}

