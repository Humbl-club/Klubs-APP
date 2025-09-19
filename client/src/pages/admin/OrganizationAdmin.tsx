import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Building, 
  Settings, 
  Palette, 
  QrCode, 
  Shield, 
  Users,
  AlertCircle
} from 'lucide-react';
import { Store } from 'lucide-react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { OrganizationSettings } from '../../components/admin/OrganizationSettings';
import { FeatureManagement } from '../../components/admin/FeatureManagement';
import { MobileFeatureToggles } from '../../components/admin/MobileFeatureToggles';
import BrandingCustomizationPlaceholder from '../../components/admin/BrandingCustomizationPlaceholder';
import { ThemeEditor } from '../../components/admin/ThemeEditor';
import { InviteCodeManager } from '../../components/admin/InviteCodeManager';
import { ContentModerationDashboard } from '../../components/admin/ContentModerationDashboard';
import { ICSTokenManager } from '../../components/admin/ICSTokenManager';
import { OrganizationSwitcher } from '../../components/organization/OrganizationSwitcher';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useMobileFirst } from '../../hooks/useMobileFirst';
import { CommerceSettings } from '../../components/admin/CommerceSettings';
import { LoyaltySettings } from '../../components/admin/LoyaltySettings';

const OrganizationAdmin: React.FC = () => {
  const { isMobile } = useMobileFirst();
  const { currentOrganization, isAdmin, loading } = useOrganization();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
            <p className="text-gray-600 mb-4">You need to select an organization to access admin features.</p>
            <OrganizationSwitcher className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-4">
              You need admin privileges to access organization management features.
            </p>
            <p className="text-sm text-gray-500">
              Contact your organization owner to request admin access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Organization Administration</h1>
            <p className="text-gray-600 mt-1">
              Manage settings, features, and members for {currentOrganization.name}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <OrganizationSwitcher />
          </div>
        </div>

        {/* Organization Status */}
        <Alert className="mb-6">
          <Building className="w-4 h-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Currently managing <strong>{currentOrganization.name}</strong> 
                ({currentOrganization.subscription_tier || 'free'} plan)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Max {currentOrganization.max_members} members</span>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-500">Active</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Admin Interface */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-5' : 'grid-cols-9'} mb-8`}>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {!isMobile && 'Settings'}
          </TabsTrigger>
          
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            {!isMobile && 'Features'}
          </TabsTrigger>
          
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {!isMobile && 'Branding'}
          </TabsTrigger>
          
          <TabsTrigger value="invites" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            {!isMobile && 'Invites'}
          </TabsTrigger>

          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {!isMobile && 'Calendar'}
          </TabsTrigger>
          
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {!isMobile && 'Moderation'}
          </TabsTrigger>
          
          {!isMobile && (
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
          )}
          <TabsTrigger value="commerce" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            {!isMobile && 'Commerce'}
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            {!isMobile && 'Loyalty'}
          </TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="settings">
          <OrganizationSettings />
        </TabsContent>

        {/* Feature Management */}
        <TabsContent value="features">
          {isMobile ? <MobileFeatureToggles /> : <FeatureManagement />}
        </TabsContent>

        {/* Branding Customization */}
        <TabsContent value="branding">
          <ThemeEditor />
        </TabsContent>

        {/* Invite Code Management */}
        <TabsContent value="invites">
          <InviteCodeManager />
        </TabsContent>

        {/* Calendar Feed Management */}
        <TabsContent value="calendar">
          <ICSTokenManager />
        </TabsContent>

        {/* Content Moderation */}
        <TabsContent value="moderation">
          <ContentModerationDashboard />
        </TabsContent>
        <TabsContent value="commerce">
          <CommerceSettings />
        </TabsContent>
        <TabsContent value="loyalty">
          <LoyaltySettings />
        </TabsContent>

        {/* Members Management */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Member Management
              </CardTitle>
              <CardDescription>
                Manage organization members, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Member Management</h3>
                <p className="text-gray-600">
                  Advanced member management features will be available here.
                  Use the organization switcher to manage members across different organizations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Quick Actions</h3>
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2 text-sm`}>
          <button className="text-left p-2 hover:bg-gray-100 rounded">
            📊 View Analytics
          </button>
          <button className="text-left p-2 hover:bg-gray-100 rounded">
            💬 Export Data
          </button>
          <button className="text-left p-2 hover:bg-gray-100 rounded">
            🔧 API Settings
          </button>
          <button className="text-left p-2 hover:bg-gray-100 rounded">
            📱 PWA Config
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationAdmin;
