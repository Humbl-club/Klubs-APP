import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileToggle } from '@/components/ui/mobile-toggle';
import { Bell, Shield, Heart, Users, Palette, Save, MessageCircle, Lock, Search, ChevronRight, ArrowLeft, User, Settings as SettingsIcon, Gift } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useOrganization } from '@/contexts/OrganizationContext';
import { MobileFeatureToggles } from '@/components/admin/MobileFeatureToggles';
import { LoyaltyConnect } from '@/components/loyalty/LoyaltyConnect';

// Define the UserSettings type locally to match the hook
interface UserSettings {
  appearance: {
    theme: string;
    font_size: string;
    glassmorphism_enabled: boolean;
    high_contrast: boolean;
    animations_enabled: boolean;
  };
  notifications: {
    push_enabled: boolean;
    email_enabled: boolean;
    event_reminders: boolean;
    challenge_updates: boolean;
    social_interactions: boolean;
    notification_frequency: string;
    quiet_hours_start: string;
    quiet_hours_end: string;
  };
  wellness: {
    activity_reminders: boolean;
    daily_goal_steps: number;
    water_reminders: boolean;
    mindfulness_reminders: boolean;
    sleep_tracking: boolean;
    health_data_sharing: boolean;
  };
  social: {
    activity_visibility: string;
    auto_follow_friends: boolean;
    content_suggestions: boolean;
    story_sharing: boolean;
    message_requests: boolean;
    group_invitations: boolean;
  };
  privacy: {
    profile_visibility: string;
    allow_messages: string;
    show_activity_status: boolean;
    allow_location_sharing: boolean;
    allow_friend_requests: boolean;
  };
}
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

import { SwipeableCard } from '@/components/ui/swipeable-card';

import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AccountManagement } from '@/components/settings/AccountManagement';
import { ThemeGallery } from '@/components/theme/ThemeGallery';

const Settings: React.FC = () => {
  const { settings, loading, saving, updateSetting } = useUserSettings();
  const navigate = useNavigate();
  const { section } = useParams();
  const { isMobile, isTablet, spacing, padding, fontSize, formLayout, containerClass } = useMobileOptimization();
  const feedback = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin } = useOrganization();
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);
  

  const [density, setDensity] = useState<string>(() => localStorage.getItem('density') || 'comfortable');

  useEffect(() => {
    const root = document.documentElement;
    if (density === 'compact') {
      root.setAttribute('data-density', 'compact');
    } else {
      root.removeAttribute('data-density');
    }
    localStorage.setItem('density', density);
  }, [density]);

  // Sync selected section from route (/settings/:section)
  useEffect(() => {
    if (section) setActiveMobileSection(section as string);
    else setActiveMobileSection(null);
  }, [section]);

  // Settings sections for mobile - simplified, purpose-driven
  const settingSections = useMemo(() => {
    const base = [
      {
      id: 'account',
      title: 'Account',
      icon: User,
      description: 'Email, password, export/delete',
      keywords: ['password', 'email', 'delete', 'export', 'security', 'account']
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Push and email preferences',
      keywords: ['push', 'email', 'alerts', 'reminders']
    },
    {
      id: 'privacy',
      title: 'Privacy',
      icon: Shield,
      description: 'Profile visibility and messaging',
      keywords: ['profile', 'visibility', 'messages', 'groups']
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      description: 'Theme, font size, contrast',
      keywords: ['theme', 'dark', 'light', 'font', 'contrast', 'animations']
    }
    ] as Array<{id:string,title:string,icon:any,description:string,keywords:string[]}>
    if (isAdmin) {
      base.unshift({ id: 'features', title: 'Features', icon: SettingsIcon, description: 'Toggle Events, Social, Challenges, Commerce', keywords: ['features','commerce','events','social','challenges'] })
    }
    // Always expose Loyalty under Settings if org has a loyalty integration; we detect lazily at render time
    base.push({ id: 'loyalty', title: 'Loyalty', icon: Gift, description: 'Link your store loyalty account and sync points', keywords: ['loyalty','points','store'] })
    return base
  }, [isAdmin]);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return settingSections;
    
    const query = searchQuery.toLowerCase();
    return settingSections.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.includes(query))
    );
  }, [searchQuery, settingSections]);

  // Render mobile section content - stable reference with useCallback
  const renderMobileSectionContent = useCallback((sectionId: string) => {
    // Return loading state if settings are not loaded
    if (!settings) {
      return (
        <Card className="glass-card-enhanced p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-lg w-48 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-64 mx-auto"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading settings...</p>
        </Card>
      );
    }
    
    switch (sectionId) {
      case 'features':
        return <MobileFeatureToggles />;
      case 'privacy':
        return <PrivacySettings />;

      case 'account':
        return <AccountManagement />;

      case 'notifications':
        return <NotificationSettings />;

      case 'wellness':
        return (
          <Card className="glass-card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Wellness & Health
              </CardTitle>
              <CardDescription>
                Manage your wellness tracking and reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="activityReminders">Activity Reminders</Label>
                  <MobileToggle
                    checked={settings.wellness.activity_reminders}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('wellness', 'activity_reminders', checked);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailySteps">Daily Step Goal</Label>
                  <Input
                    id="dailySteps"
                    type="number"
                    value={settings.wellness.daily_goal_steps}
                    onChange={(e) => updateSetting('wellness', 'daily_goal_steps', parseInt(e.target.value) || 8000)}
                    min="1000"
                    max="50000"
                    className="h-12 text-lg"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="waterReminders">Water Reminders</Label>
                  <MobileToggle
                    checked={settings.wellness.water_reminders}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('wellness', 'water_reminders', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="sleepTracking">Sleep Tracking</Label>
                  <MobileToggle
                    checked={settings.wellness.sleep_tracking}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('wellness', 'sleep_tracking', checked);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );


      case 'appearance':
        return (
          <Card className="glass-card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={settings.appearance.theme} 
                    onValueChange={(value) => {
                      feedback.tap();
                      updateSetting('appearance', 'theme', value);
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select 
                    value={settings.appearance.font_size} 
                    onValueChange={(value) => {
                      feedback.tap();
                      updateSetting('appearance', 'font_size', value);
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Theme - Visual Gallery */}
                <div className="space-y-2">
                  <Label>Brand theme</Label>
                  <ThemeGallery />
                </div>


                {/* Density */}
                <div className="space-y-2">
                  <Label htmlFor="density">Density</Label>
                  <Select value={density} onValueChange={(v) => { setDensity(v); feedback.tap(); }}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="glassmorphism">Glassmorphism Effects</Label>
                  <MobileToggle
                    checked={settings.appearance.glassmorphism_enabled}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('appearance', 'glassmorphism_enabled', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <MobileToggle
                    checked={settings.appearance.animations_enabled}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('appearance', 'animations_enabled', checked);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'loyalty':
        return <LoyaltyConnect />;

      case 'messaging':
        return (
          <Card className="glass-card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messaging & Communication
              </CardTitle>
              <CardDescription>
                Control your messaging preferences and encryption settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label htmlFor="allowMessages">Allow Direct Messages</Label>
                    <p className="text-sm text-muted-foreground">Enable direct messaging with other members</p>
                  </div>
                  <MobileToggle
                    checked={settings.social.message_requests}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('social', 'message_requests', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label htmlFor="messagePreview">Message Previews</Label>
                    <p className="text-sm text-muted-foreground">Show message previews in notifications</p>
                  </div>
                  <MobileToggle
                    checked={settings.notifications.social_interactions}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('notifications', 'social_interactions', checked);
                    }}
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">End-to-End Encryption</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        All messages are encrypted with client-side keys. Even administrators cannot read your conversations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'social':
        return (
          <Card className="glass-card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social Features
              </CardTitle>
              <CardDescription>
                Configure your social interaction preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="autoFollowFriends">Auto-Follow Event Attendees</Label>
                  <MobileToggle
                    checked={settings.social.auto_follow_friends}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('social', 'auto_follow_friends', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="contentSuggestions">Content Suggestions</Label>
                  <MobileToggle
                    checked={settings.social.content_suggestions}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('social', 'content_suggestions', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <Label htmlFor="storySharing">Story Sharing</Label>
                  <MobileToggle
                    checked={settings.social.story_sharing}
                    onCheckedChange={(checked) => {
                      feedback.tap();
                      updateSetting('social', 'story_sharing', checked);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityVisibility">Activity Visibility</Label>
                  <Select 
                    value={settings.social.activity_visibility} 
                    onValueChange={(value) => {
                      feedback.tap();
                      updateSetting('social', 'activity_visibility', value);
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  }, [settings, feedback, updateSetting]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="glass-card-enhanced p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Palette className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your app experience</p>
          </div>
        </div>

        {/* Search bar for mobile */}
        {isMobile && (
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {loading || !settings ? (
        <div className="glass-card-enhanced p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-lg w-48 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-64 mx-auto"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading your settings...</p>
        </div>
      ) : (
        isMobile ? (
        activeMobileSection ? (
          // Mobile section detail view
          <div className="space-y-4">
            {/* Back navigation */}
            <div className="glass-card-enhanced p-4">
              <button
                onClick={() => {
                  feedback.tap();
                  navigate('/settings');
                }}
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back to Settings</span>
              </button>
            </div>
            
            {/* Section content */}
            {renderMobileSectionContent(activeMobileSection)}
          </div>
        ) : (
          // Mobile vertical sections layout
          <div className="space-y-4">
            {filteredSections.length === 0 ? (
              <Card className="glass-card-enhanced p-8 text-center">
                <p className="text-muted-foreground">No settings found for "{searchQuery}"</p>
              </Card>
            ) : (
              filteredSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <SwipeableCard 
                    key={section.id} 
                    className="p-0"
                    onTap={() => {
                      feedback.tap();
                      navigate(`/settings/${section.id}`);
                    }}
                  >
                    <Card className="border-0 shadow-none cursor-pointer hover:bg-muted/30 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <IconComponent className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{section.title}</h3>
                              <p className="text-sm text-muted-foreground">{section.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                );
              })
            )}
          </div>
          )
      ) : (
        // Desktop tabs layout
        <Tabs defaultValue="account" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-4 gap-1 p-1">
              <TabsTrigger value="privacy" className="flex items-center gap-2 flex-shrink-0">
                <Shield className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 flex-shrink-0">
                <Bell className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2 flex-shrink-0">
                <User className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Account</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2 flex-shrink-0">
                <Palette className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Appearance</span>
              </TabsTrigger>
            </TabsList>
          </div>
        <TabsContent value="account">
          <AccountManagement />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="account">
          <AccountManagement />
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="glass-card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance & Theme
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={settings.appearance.theme} onValueChange={(value) => updateSetting('appearance', 'theme', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select value={settings.appearance.font_size} onValueChange={(value) => updateSetting('appearance', 'font_size', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="highContrast">High Contrast</Label>
                  <MobileToggle
                    checked={settings.appearance.high_contrast}
                    onCheckedChange={(checked) => updateSetting('appearance', 'high_contrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="glassmorphism">Glassmorphism Effects</Label>
                  <MobileToggle
                    checked={settings.appearance.glassmorphism_enabled}
                    onCheckedChange={(checked) => updateSetting('appearance', 'glassmorphism_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <MobileToggle
                    checked={settings.appearance.animations_enabled}
                    onCheckedChange={(checked) => updateSetting('appearance', 'animations_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end pt-6">
          <Button disabled={saving} className="min-w-[120px]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Auto-saved'}
          </Button>
        </div>
        </Tabs>
      ))}
    </div>
  );
};

export default Settings;
