import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../ui/use-toast';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Building, 
  Users, 
  Palette, 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Sparkles,
  Globe,
  Lock,
  CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';
import { supabase as sb } from '@/integrations/supabase/client';

const STEPS = [
  { id: 'basics', title: 'Organization Basics', icon: Building },
  { id: 'type', title: 'Organization Type', icon: Users },
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'features', title: 'Features', icon: Zap },
  { id: 'plan', title: 'Choose Plan', icon: CreditCard },
];

const ORG_TYPES = [
  { 
    id: 'fitness', 
    name: 'Fitness Studio', 
    description: 'Yoga, pilates, gym, or wellness center',
    features: ['events', 'challenges', 'loyalty']
  },
  { 
    id: 'community', 
    name: 'Community Group', 
    description: 'Social clubs, hobby groups, networking',
    features: ['social', 'events', 'messages']
  },
  { 
    id: 'professional', 
    name: 'Professional Organization', 
    description: 'Business groups, associations, chambers',
    features: ['events', 'members', 'announcements']
  },
  { 
    id: 'educational', 
    name: 'Educational', 
    description: 'Schools, training centers, workshops',
    features: ['events', 'challenges', 'leaderboard']
  },
];

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 50 members',
      'Basic features',
      'Community support',
      '1GB storage'
    ],
    recommended: false
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    features: [
      'Up to 200 members',
      'All core features',
      'Email support',
      '10GB storage',
      'Custom branding'
    ],
    recommended: false
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 99,
    features: [
      'Up to 1000 members',
      'All features',
      'Priority support',
      '100GB storage',
      'Advanced analytics',
      'API access'
    ],
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: [
      'Unlimited members',
      'All features + custom',
      'Dedicated support',
      'Unlimited storage',
      'White labeling',
      'SLA guarantee'
    ],
    recommended: false
  }
];

export const OrganizationOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basics
    name: '',
    slug: '',
    description: '',
    
    // Type
    orgType: '',
    memberEstimate: '50',
    
    // Branding
    primaryColor: '#8B5CF6',
    logoUrl: '',
    tagline: '',
    
    // Features
    selectedFeatures: [] as string[],
    
    // Plan
    subscriptionTier: 'free',
    billingCycle: 'monthly'
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const canProceed = (): boolean => {
    switch (STEPS[currentStep].id) {
      case 'basics':
        return formData.name.length > 0 && formData.slug.length > 0;
      case 'type':
        return formData.orgType.length > 0;
      case 'plan':
        return formData.subscriptionTier.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create an organization.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check entitlement for free unlimited access
      let freeUnlimited = false;
      if (user) {
        const { data: ent } = await sb
          .from('user_entitlements')
          .select('free_unlimited')
          .eq('user_id', user.id)
          .maybeSingle();
        freeUnlimited = Boolean(ent?.free_unlimited);
      }

      const selectedPlan = formData.subscriptionTier as 'free' | 'basic' | 'pro' | 'enterprise';

      if (selectedPlan === 'free' || freeUnlimited) {
        const tier = freeUnlimited && selectedPlan === 'enterprise' ? 'enterprise' : 'free';
        
        // Check if we're in Capacitor environment
        const isCapacitor = window.location.protocol === 'capacitor:';
        
        if (isCapacitor) {
          // Direct database approach for Capacitor (bypass Edge function)
          // Create organization
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: formData.name,
              slug: formData.slug,
              description: formData.description,
              subscription_tier: tier,
              subscription_status: 'active',
            })
            .select()
            .single();
          
          if (orgError) throw orgError;
          
          // Add user as owner
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: org.id,
              user_id: user.id,
              role: 'owner',
            });
          
          if (memberError) throw memberError;
          
          // Create theme
          const { error: themeError } = await supabase
            .from('organization_themes')
            .insert({
              organization_id: org.id,
              primary_color: formData.primaryColor,
            });
          
          if (themeError) throw themeError;
          
          // Add selected features
          if (formData.selectedFeatures.length > 0) {
            const featureInserts = formData.selectedFeatures.map((featureKey) => ({
              organization_id: org.id,
              feature_key: featureKey,
              enabled: true,
            }));

            const { error: featuresError } = await supabase
              .from('organization_features')
              .upsert(featureInserts as any, { onConflict: 'organization_id,feature_key' });

            if (featuresError) throw featuresError;
          }
          
          // Update user's current organization
          await supabase
            .from('profiles')
            .update({ current_organization_id: org.id })
            .eq('id', user.id);
            
        } else {
          // Use Edge function for web
          const { data, error } = await supabase.functions.invoke('create-org-free', {
            body: {
              name: formData.name,
              slug: formData.slug,
              description: formData.description,
              orgType: formData.orgType,
              primaryColor: formData.primaryColor,
              logoUrl: formData.logoUrl,
              tagline: formData.tagline,
              selectedFeatures: formData.selectedFeatures,
              plan: tier,
            }
          });
          if (error) throw error;
          if (!data?.success) {
            throw new Error('Organization creation failed');
          }
        }
        toast({ title: 'Organization Created!', description: `Welcome to ${formData.name}.` });
        await refreshOrganization();
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }

      if (selectedPlan === 'basic' || selectedPlan === 'pro') {
        // Check if we're in Capacitor environment
        const isCapacitor = window.location.protocol === 'capacitor:';
        
        if (isCapacitor) {
          // For Capacitor, create as free plan (payment can be handled separately)
          // Create organization with selected tier but as "trial" status
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: formData.name,
              slug: formData.slug,
              description: formData.description,
              subscription_tier: selectedPlan, // Store intended tier
              subscription_status: 'trial', // Start as trial until payment
            })
            .select()
            .single();
          
          if (orgError) throw orgError;
          
          // Add user as owner
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: org.id,
              user_id: user.id,
              role: 'owner',
            });
          
          if (memberError) throw memberError;
          
          // Create theme
          const { error: themeError } = await supabase
            .from('organization_themes')
            .insert({
              organization_id: org.id,
              primary_color: formData.primaryColor,
            });
          
          if (themeError) throw themeError;
          
          // Add selected features
          if (formData.selectedFeatures.length > 0) {
            const featureInserts = formData.selectedFeatures.map((featureKey) => ({
              organization_id: org.id,
              feature_key: featureKey,
              enabled: true,
            }));

            const { error: featuresError } = await supabase
              .from('organization_features')
              .upsert(featureInserts as any, { onConflict: 'organization_id,feature_key' });

            if (featuresError) throw featuresError;
          }
          
          // Update user's current organization
          await supabase
            .from('profiles')
            .update({ current_organization_id: org.id })
            .eq('id', user.id);
          
          toast({ 
            title: 'Organization Created!', 
            description: `Welcome to ${formData.name}. You can upgrade your plan in settings.` 
          });
        } else {
          // Use Edge function for web
          const origin = window.location.origin;
          const successUrl = `${origin}/organization/new?org_payment=success&session_id={CHECKOUT_SESSION_ID}`;
          const cancelUrl = `${origin}/organization/new?org_payment=cancel`;
          const { data, error } = await supabase.functions.invoke('create-org-subscription', {
            body: {
              plan: selectedPlan,
              billingCycle: 'monthly',
              orgName: formData.name,
              slug: formData.slug,
              successUrl,
              cancelUrl,
            }
          });
          if (error) throw error;
          if (data?.url) {
            window.location.href = data.url as string;
            return;
          }
          throw new Error('Failed to create checkout session');
        }
        
        await refreshOrganization();
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }

      // Enterprise plan
      if (selectedPlan === 'enterprise') {
        const isCapacitor = window.location.protocol === 'capacitor:';
        
        // Create organization directly for enterprise
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            subscription_tier: 'enterprise',
            subscription_status: 'active', // Enterprise is always active
          })
          .select()
          .single();
        
        if (orgError) throw orgError;
        
        // Add user as owner
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: user.id,
            role: 'owner',
          });
        
        if (memberError) throw memberError;
        
        // Create theme
        const { error: themeError } = await supabase
          .from('organization_themes')
          .insert({
            organization_id: org.id,
            primary_color: formData.primaryColor,
          });
        
        if (themeError) throw themeError;
        
        // Add all features for enterprise
        if (formData.selectedFeatures.length > 0) {
          const featureInserts = formData.selectedFeatures.map((featureKey) => ({
            organization_id: org.id,
            feature_key: featureKey,
            enabled: true,
          }));

          const { error: featuresError } = await supabase
            .from('organization_features')
            .upsert(featureInserts as any, { onConflict: 'organization_id,feature_key' });

          if (featuresError) throw featuresError;
        }
        
        // Update user's current organization
        await supabase
          .from('profiles')
          .update({ current_organization_id: org.id })
          .eq('id', user.id);
        
        toast({ 
          title: 'Organization Created!', 
          description: `Welcome to ${formData.name} - Enterprise Edition!` 
        });
        
        await refreshOrganization();
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }
      
      throw new Error('Unsupported plan');

    } catch (error) {
      console.error('Failed to create organization:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create organization. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Stripe Checkout return for organization subscription
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('org_payment');
    const sessionId = params.get('session_id');
    if (status === 'success' && sessionId) {
      (async () => {
        try {
          toast({ title: 'Finalizing organization setup…' });
          const { data, error } = await supabase.functions.invoke('verify-org-subscription', {
            body: { sessionId }
          });
          if (error) throw error;
          if (!data?.success) throw new Error('Subscription not active');
          await refreshOrganization();
          const url = new URL(window.location.href);
          url.searchParams.delete('org_payment');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
          navigate('/dashboard');
        } catch (e) {
          toast({ title: 'Setup failed', description: 'Please contact support.', variant: 'destructive' });
        }
      })();
    }
  }, [navigate, refreshOrganization]);

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'basics':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Humble Girls Club"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center mt-1">
                <span className="text-sm text-muted-foreground mr-2">app.club/</span>
                <Input
                  id="slug"
                  placeholder="humble-girls"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us about your organization..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        );
      
      case 'type':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={formData.orgType}
              onValueChange={(value) => handleInputChange('orgType', value)}
            >
              {ORG_TYPES.map((type) => (
                <div
                  key={type.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors",
                    formData.orgType === type.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleInputChange('orgType', type.id)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={type.id} id={type.id} />
                    <div className="flex-1">
                      <Label htmlFor={type.id} className="cursor-pointer">
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </div>
                      </Label>
                      <div className="flex gap-2 mt-2">
                        {type.features.map(f => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
            
            <div>
              <Label htmlFor="members">Estimated Members</Label>
              <Select
                value={formData.memberEstimate}
                onValueChange={(value) => handleInputChange('memberEstimate', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Under 50</SelectItem>
                  <SelectItem value="200">50-200</SelectItem>
                  <SelectItem value="500">200-500</SelectItem>
                  <SelectItem value="1000">500-1000</SelectItem>
                  <SelectItem value="5000">1000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'branding':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="color">Primary Brand Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="color"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="flex-1"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="logo">Logo URL (Optional)</Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="tagline">Tagline (Optional)</Label>
              <Input
                id="tagline"
                placeholder="Your inspiring tagline..."
                value={formData.tagline}
                onChange={(e) => handleInputChange('tagline', e.target.value)}
                className="mt-1"
              />
            </div>
            
            {formData.logoUrl && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={formData.logoUrl} 
                    alt="Logo preview" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <p className="font-medium">{formData.name}</p>
                    {formData.tagline && (
                      <p className="text-sm text-muted-foreground">{formData.tagline}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'features':
        const AVAILABLE_FEATURES = [
          { id: 'social', name: 'Social Feed', icon: '💬' },
          { id: 'events', name: 'Event Management', icon: '📅' },
          { id: 'challenges', name: 'Wellness Challenges', icon: '🏆' },
          { id: 'loyalty', name: 'Loyalty Points', icon: '🎁' },
          { id: 'messages', name: 'Direct Messaging', icon: '💌' },
          { id: 'leaderboard', name: 'Leaderboards', icon: '🏅' },
          { id: 'analytics', name: 'Analytics', icon: '📊' },
          { id: 'members', name: 'Member Directory', icon: '👥' },
        ];
        
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the features you want to enable. You can change these later.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_FEATURES.map((feature) => {
                const isSelected = formData.selectedFeatures.includes(feature.id);
                const orgType = ORG_TYPES.find(t => t.id === formData.orgType);
                const isDefault = orgType?.features.includes(feature.id);
                
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => {
                      if (isDefault) return; // Can't deselect default features
                      
                      handleInputChange(
                        'selectedFeatures',
                        isSelected 
                          ? formData.selectedFeatures.filter(f => f !== feature.id)
                          : [...formData.selectedFeatures, feature.id]
                      );
                    }}
                    className={cn(
                      "p-3 border rounded-lg text-left transition-colors",
                      (isSelected || isDefault) && "border-primary bg-primary/5",
                      !isDefault && "hover:border-primary cursor-pointer",
                      isDefault && "cursor-default opacity-75"
                    )}
                    disabled={isDefault}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{feature.icon}</span>
                        <span className="text-sm font-medium">{feature.name}</span>
                      </div>
                      {(isSelected || isDefault) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Included
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      
      case 'plan':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors relative",
                    formData.subscriptionTier === plan.id && "border-primary bg-primary/5",
                    plan.recommended && "border-primary"
                  )}
                  onClick={() => handleInputChange('subscriptionTier', plan.id)}
                >
                  {plan.recommended && (
                    <Badge className="absolute -top-2 right-4 bg-primary text-white">
                      Recommended
                    </Badge>
                  )}
                  
                  <div className="mb-3">
                    <h3 className="font-medium text-lg">{plan.name}</h3>
                    <div className="text-2xl font-bold mt-1">
                      {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                      {typeof plan.price === 'number' && (
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      )}
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            {formData.subscriptionTier !== 'free' && formData.subscriptionTier !== 'enterprise' && (
              <div>
                <Label>Billing Cycle</Label>
                <RadioGroup
                  value={formData.billingCycle}
                  onValueChange={(value) => handleInputChange('billingCycle', value)}
                  className="mt-1"
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly">Monthly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yearly" id="yearly" />
                      <Label htmlFor="yearly">
                        Yearly (Save 20%)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Create Your Organization
            </CardTitle>
            <Badge variant="outline">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        
        <CardContent>
          {/* Step Indicators */}
          <div className="flex justify-between mb-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center gap-2",
                    isActive && "text-primary",
                    !isActive && !isCompleted && "text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2",
                      isActive && "border-primary bg-primary text-white",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      !isActive && !isCompleted && "border-gray-300"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {STEPS[currentStep].title}
            </h2>
            {renderStepContent()}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            {currentStep === STEPS.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
