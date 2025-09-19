# Multi-Tenant Club Platform Transformation Plan

## Executive Summary
Transform the current single-club Humbl Girls Club app into a **multi-tenant SaaS platform** where multiple independent clubs can operate within the same iOS application, each with their own isolated data, members, and modular features.

## Architecture Overview

### Current State
- Single tenant application (one club)
- Direct Supabase connection
- All users share same data space
- Fixed feature set for all users

### Target State
- Multi-tenant platform (unlimited clubs)
- Each club has isolated data
- Modular feature selection per club
- iOS app via Capacitor
- Subscription-based monetization

## Phase 1: Database Multi-Tenancy (2-3 weeks)

### 1.1 Core Schema Changes
```sql
-- New tables needed
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  owner_id UUID REFERENCES auth.users(id),
  subscription_tier TEXT DEFAULT 'free',
  feature_flags JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, moderator, member
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- events, challenges, social, messaging, loyalty
  enabled BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{}',
  UNIQUE(organization_id, feature_key)
);
```

### 1.2 Modify Existing Tables
Add `organization_id` to all data tables:
- events → organization_id
- challenges → organization_id
- social_posts → organization_id
- direct_messages → organization_id (for intra-club messaging)
- loyalty_transactions → organization_id
- All other feature tables

### 1.3 Row Level Security (RLS) Updates
```sql
-- Example RLS policy for events
CREATE POLICY "Users can only see their organization's events"
ON events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

## Phase 2: Modular Feature System (3-4 weeks)

### 2.1 Feature Modules
```typescript
// Feature module interface
interface FeatureModule {
  key: string;
  name: string;
  description: string;
  requiredTables: string[];
  requiredPermissions: string[];
  components: {
    dashboard?: React.Component;
    settings?: React.Component;
    mobile?: React.Component;
  };
  routes: RouteConfig[];
  navigationItems: NavItem[];
}

// Available modules
const FEATURE_MODULES = {
  events: {
    key: 'events',
    name: 'Event Management',
    description: 'Create and manage club events with registration',
    includes: ['QR attendance', 'Payments', 'Calendar'],
    pricing: 'premium'
  },
  challenges: {
    key: 'challenges',
    name: 'Wellness Challenges',
    description: 'Step tracking and wellness competitions',
    includes: ['Leaderboards', 'Rewards', 'Apple Health'],
    pricing: 'premium'
  },
  social: {
    key: 'social',
    name: 'Social Feed',
    description: 'Posts, comments, and community interaction',
    includes: ['Posts', 'Stories', 'Reactions'],
    pricing: 'standard'
  },
  messaging: {
    key: 'messaging',
    name: 'Direct Messaging',
    description: 'Encrypted member-to-member messaging',
    includes: ['End-to-end encryption', 'Group chats'],
    pricing: 'standard'
  },
  loyalty: {
    key: 'loyalty',
    name: 'Points & Rewards',
    description: 'Loyalty points system with rewards',
    includes: ['Points earning', 'Rewards catalog'],
    pricing: 'premium'
  },
  payments: {
    key: 'payments',
    name: 'Payment Processing',
    description: 'Accept payments via Stripe',
    includes: ['Credit cards', 'Invoicing'],
    pricing: 'business'
  }
};
```

### 2.2 Dynamic Feature Loading
```typescript
// FeatureProvider.tsx
export const FeatureProvider: React.FC = ({ children }) => {
  const { organization } = useOrganization();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    // Load organization's enabled features
    loadOrganizationFeatures(organization.id)
      .then(setEnabledFeatures);
  }, [organization]);

  return (
    <FeatureContext.Provider value={{ enabledFeatures }}>
      {children}
    </FeatureContext.Provider>
  );
};

// Usage in components
const EventsPage = () => {
  const { hasFeature } = useFeatures();
  
  if (!hasFeature('events')) {
    return <FeatureNotAvailable feature="Events" />;
  }
  
  return <EventsComponent />;
};
```

## Phase 3: Club Onboarding Flow (2 weeks)

### 3.1 Club Creation Wizard
```typescript
// Steps:
1. Account Creation (Club Owner)
2. Club Details (Name, Description, Logo)
3. Feature Selection (Choose modules)
4. Subscription Plan Selection
5. Payment Setup (Stripe integration)
6. Initial Configuration
7. Invite First Members
```

### 3.2 Member Invitation System
```typescript
interface InviteFlow {
  // Club owner generates invite link/code
  generateInvite(role: 'admin' | 'member'): string;
  
  // New user joins via invite
  acceptInvite(code: string): Promise<void>;
  
  // Bulk invite via email
  bulkInvite(emails: string[]): Promise<void>;
}
```

## Phase 4: iOS Native App Setup (2 weeks)

### 4.1 Capacitor Configuration
```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.girlsclub.platform',
  appName: 'Girls Club Platform',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      showSpinner: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
```

### 4.2 iOS Build Process
```bash
# Add iOS platform
npx cap add ios

# Build web assets
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 4.3 Required iOS Configurations
- Configure App Groups for data sharing
- Set up Push Notification certificates
- Configure Universal Links for deep linking
- Add HealthKit permissions
- Set up Keychain sharing for secure storage

## Phase 5: Organization Isolation & Context (2 weeks)

### 5.1 Organization Context Provider
```typescript
// OrganizationProvider.tsx
export const OrganizationProvider: React.FC = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Get user's organizations
      getUserOrganizations(user.id).then(orgs => {
        // Set default org or show selector
        setCurrentOrg(orgs[0] || null);
      });
    }
  }, [user]);

  return (
    <OrganizationContext.Provider value={{
      organization: currentOrg,
      switchOrganization: setCurrentOrg
    }}>
      {currentOrg ? children : <OrganizationSelector />}
    </OrganizationContext.Provider>
  );
};
```

### 5.2 Data Filtering
All queries must include organization context:
```typescript
// Before
const { data: events } = await supabase
  .from('events')
  .select('*');

// After
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('organization_id', currentOrg.id);
```

## Phase 6: Subscription & Billing (2 weeks)

### 6.1 Subscription Tiers
```typescript
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Starter',
    price: 0,
    maxMembers: 10,
    features: ['social'],
    storage: '1GB'
  },
  standard: {
    name: 'Standard',
    price: 29.99,
    maxMembers: 50,
    features: ['social', 'messaging', 'events'],
    storage: '10GB'
  },
  premium: {
    name: 'Premium',
    price: 79.99,
    maxMembers: 200,
    features: ['all'],
    storage: '50GB'
  },
  business: {
    name: 'Business',
    price: 199.99,
    maxMembers: 'unlimited',
    features: ['all', 'api_access', 'white_label'],
    storage: '500GB'
  }
};
```

### 6.2 Stripe Subscription Integration
- Create Stripe products for each tier
- Implement subscription management
- Handle upgrades/downgrades
- Usage-based billing for add-ons

## Implementation Timeline

### Month 1
- Week 1-2: Database multi-tenancy
- Week 3-4: Core organization management

### Month 2
- Week 1-2: Modular feature system
- Week 3-4: Feature selection & configuration

### Month 3
- Week 1-2: Club onboarding flow
- Week 3-4: iOS native app setup

### Month 4
- Week 1-2: Subscription & billing
- Week 3-4: Testing & refinement

## Technical Considerations

### Data Isolation Strategy
1. **Database Level**: Separate schemas per organization (complex but complete isolation)
2. **Row Level**: Shared tables with organization_id (simpler, current recommendation)
3. **Hybrid**: Critical data in separate schemas, shared data in common tables

### Performance Optimization
- Implement caching per organization
- Use database indexes on organization_id
- Consider read replicas for large clubs
- Implement rate limiting per organization

### Security Requirements
- Ensure complete data isolation between clubs
- Implement organization-level 2FA
- Audit logging per organization
- GDPR compliance per club

### iOS App Store Considerations
- Single app submission covering all clubs
- In-app purchases for subscriptions
- Deep linking for club-specific URLs
- Universal app (iPhone + iPad)

## Migration Strategy

### For Existing Single Club
1. Create default organization
2. Migrate all existing data to include organization_id
3. Update all queries to include organization context
4. Deploy multi-tenant version
5. Enable new club registrations

### Rollback Plan
- Keep single-tenant backup
- Feature flag for multi-tenancy
- Gradual rollout to test clubs
- Database snapshots before migration

## Success Metrics
- Number of active clubs
- Members per club
- Feature adoption rates
- Revenue per club
- User engagement metrics
- App Store rating

## Risks & Mitigations

### Risk 1: Data Leakage
**Mitigation**: Comprehensive RLS policies, regular security audits

### Risk 2: Performance Degradation
**Mitigation**: Database optimization, caching, monitoring

### Risk 3: Complex Onboarding
**Mitigation**: Guided wizard, templates, video tutorials

### Risk 4: iOS App Rejection
**Mitigation**: Follow Apple guidelines, beta testing, phased rollout

## Next Steps
1. Review and approve transformation plan
2. Set up development environment for multi-tenant testing
3. Begin Phase 1 implementation
4. Create detailed technical specifications
5. Establish testing framework for multi-tenancy
