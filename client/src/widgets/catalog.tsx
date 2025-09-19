import React from 'react'
import { Calendar, Zap, Megaphone, Heart, Gift, Users, Star, Store } from 'lucide-react'
import type { WidgetKey, WidgetMeta } from './types'

// Lightweight blocks (mobile-first)
export const WidgetCatalog: Record<WidgetKey, WidgetMeta> = {
  'featured-event': {
    key: 'featured-event',
    name: 'Featured Event',
    icon: Calendar,
    description: 'Highlight one event at the top',
    featureFlag: 'events',
    defaultProps: { daysAhead: 14 }
  },
  'upcoming-events': {
    key: 'upcoming-events',
    name: 'Upcoming Events',
    icon: Calendar,
    description: 'List a few upcoming events',
    featureFlag: 'events',
    defaultProps: { limit: 3, filter: 'this_week' }
  },
  'steps': {
    key: 'steps',
    name: 'Steps & Activity',
    icon: Heart,
    description: 'Show your recent steps and progress',
    featureFlag: 'challenges',
    defaultProps: { timeframe: 'week' }
  },
  'promo': {
    key: 'promo',
    name: 'Promotion',
    icon: Megaphone,
    description: 'Announce a sale or message',
    defaultProps: { title: 'Special Offer', text: 'Tap to learn more', href: '#' }
  },
  'quick-actions': {
    key: 'quick-actions',
    name: 'Quick Actions',
    icon: Zap,
    description: 'Scan QR / Create Event / Invite',
    defaultProps: { items: ['scan-qr','create-event','invite'] }
  },
  'points': {
    key: 'points',
    name: 'Loyalty Points',
    icon: Gift,
    description: 'Show your available points',
    defaultProps: {}
  },
  'community-highlights': {
    key: 'community-highlights',
    name: 'Community Highlights',
    icon: Users,
    description: 'Top posts from your community',
    featureFlag: 'social',
    defaultProps: { limit: 3 }
  },
  'mini-calendar': {
    key: 'mini-calendar',
    name: 'Mini Calendar',
    icon: Calendar,
    description: '7-day glance with event dots',
    featureFlag: 'events',
    defaultProps: { days: 7 }
  },
  'leaderboard': {
    key: 'leaderboard',
    name: 'Leaderboard',
    icon: Star,
    description: 'Top steps/challenge leaderboard',
    featureFlag: 'challenges',
    defaultProps: { limit: 5 }
  },
  'store-carousel': {
    key: 'store-carousel',
    name: 'Store Carousel',
    icon: Store,
    description: 'Carousel of promos or items',
    featureFlag: 'commerce',
    defaultProps: { images: [] }
  },
  'product-grid': {
    key: 'product-grid',
    name: 'Product Grid',
    icon: Store,
    description: 'Grid of products from a collection',
    featureFlag: 'commerce',
    defaultProps: { collectionHandle: '', first: 6, search: '' }
  },
  'featured-product': {
    key: 'featured-product',
    name: 'Featured Product',
    icon: Store,
    description: 'Highlight a single product by handle',
    featureFlag: 'commerce',
    defaultProps: { productHandle: '' }
  },
  'offer-banner': {
    key: 'offer-banner',
    name: 'Offer Banner',
    icon: Megaphone,
    description: 'Big promo banner with link',
    defaultProps: { title: 'Limited Offer', text: 'Tap to learn more', href: '#', image: '' }
  }
  ,
  'mini-cart': {
    key: 'mini-cart',
    name: 'Mini Cart',
    icon: Store,
    description: 'Show cart item count and checkout button',
    featureFlag: 'commerce',
    defaultProps: {}
  }
}

export const orderedCatalog = Object.values(WidgetCatalog)
