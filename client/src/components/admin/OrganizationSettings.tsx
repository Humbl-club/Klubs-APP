import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Building, 
  Users, 
  Settings, 
  Save, 
  Upload,
  Crown,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useOrganization } from '../../contexts/OrganizationContext';
import { supabase } from '../../integrations/supabase/client';
import { useMobileFirst } from '../../hooks/useMobileFirst';

export const OrganizationSettings: React.FC = () => {
  const { isMobile } = useMobileFirst();
  const { currentOrganization, isAdmin } = useOrganization();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subscription_tier: 'free',
    max_members: 50,
    settings: {}
  });

  const [stats, setStats] = useState({
    memberCount: 0,
    activeEvents: 0,
    totalPosts: 0
  });

  // Load organization data
  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || '',
        slug: currentOrganization.slug || '',
        subscription_tier: currentOrganization.subscription_tier || 'free',
        max_members: currentOrganization.max_members || 50,
        settings: currentOrganization.settings || {}
      });
      loadOrganizationStats();
    }
  }, [currentOrganization]);

  const loadOrganizationStats = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      // Get member count
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      // Get active events count
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .gte('end_date', new Date().toISOString());

      // Get total posts count
      const { count: postCount } = await supabase
        .from('social_posts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      setStats({
        memberCount: memberCount || 0,
        activeEvents: eventCount || 0,
        totalPosts: postCount || 0
      });
    } catch (err) {
      console.error('Failed to load organization stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!currentOrganization?.id || !isAdmin) {
      setError('Only admins can update organization settings');
      return;
    }

    if (!formData.name.trim() || !formData.slug.trim()) {
      setError('Organization name and slug are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          slug: formData.slug.trim().toLowerCase(),
          subscription_tier: formData.subscription_tier,
          max_members: formData.max_members,
          settings: formData.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      setSuccess('Organization settings updated successfully!');
      
      // Refresh the organization context
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Failed to update organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'pro': return <Star className="w-4 h-4 text-blue-600" />;
      case 'basic': return <Settings className="w-4 h-4 text-green-600" />;
      default: return <Building className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTierLimits = (tier: string) => {
    switch (tier) {
      case 'enterprise': return { members: 'Unlimited', features: 'All features' };
      case 'pro': return { members: '1,000', features: 'All features' };
      case 'basic': return { members: '200', features: 'Most features' };
      default: return { members: '50', features: 'Basic features' };
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-gray-600">Only organization admins can access these settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Organization Overview
          </CardTitle>
          <CardDescription>
            Manage your organization settings and view key statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.memberCount}</div>
              <div className="text-sm text-blue-600">Active Members</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activeEvents}</div>
              <div className="text-sm text-green-600">Active Events</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalPosts}</div>
              <div className="text-sm text-purple-600">Total Posts</div>
            </div>
          </div>

          {/* Current Plan */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getTierIcon(currentOrganization?.subscription_tier || 'free')}
              <div>
                <div className="font-medium capitalize">
                  {currentOrganization?.subscription_tier || 'Free'} Plan
                </div>
                <div className="text-sm text-gray-600">
                  {getTierLimits(currentOrganization?.subscription_tier || 'free').members} members • {getTierLimits(currentOrganization?.subscription_tier || 'free').features}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentOrganization?.subscription_status || 'active'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your organization's basic information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter organization name"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="organization-url-slug"
                disabled={saving}
              />
              <p className="text-xs text-gray-500">
                Used in signup URLs: /{formData.slug}/signup
              </p>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="tier">Subscription Tier</Label>
              <Select
                value={formData.subscription_tier}
                onValueChange={(value) => handleInputChange('subscription_tier', value)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Free (50 members)
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Basic (200 members)
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Pro (1,000 members)
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Enterprise (Unlimited)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min="1"
                max="999999"
                value={formData.max_members}
                onChange={(e) => handleInputChange('max_members', parseInt(e.target.value) || 50)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common organization management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <Button variant="outline" className="justify-start h-auto p-4">
              <Users className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Manage Members</div>
                <div className="text-sm text-gray-500">Add, remove, or update member roles</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <Settings className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Configure Features</div>
                <div className="text-sm text-gray-500">Enable or disable organization features</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <Upload className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Customize Branding</div>
                <div className="text-sm text-gray-500">Update logos, colors, and themes</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <Building className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Invite Codes</div>
                <div className="text-sm text-gray-500">Create and manage invite codes</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};