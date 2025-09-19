
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import NotificationService from '@/services/notificationService';
import { BrandProvider } from '@/contexts/BrandContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ThemeController } from '@/components/theme/ThemeController';
import EnhancedErrorBoundary from '@/components/ui/enhanced-error-boundary';
import { CapacitorErrorBoundary } from '@/components/ui/capacitor-error-boundary';

// Create a page loader component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Error boundary for lazy loading failures
class LazyBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Failed to load page</h2>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Keep critical pages non-lazy for immediate loading
import Index from './pages/Index';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

// Lazy load all other pages
const OrganizationSignup = lazy(() => 
  import('./pages/OrganizationSignup').then(module => ({ default: module.default }))
);

const OrganizationOnboarding = lazy(() => 
  import('./components/organization/OrganizationOnboarding').then(module => ({ default: module.OrganizationOnboarding }))
);

const InviteJoin = lazy(() => 
  import('./pages/InviteJoin').then(module => ({ default: module.default }))
);
const Dashboard = lazy(() => 
  import('./pages/Dashboard').then(module => ({ default: module.default }))
);

const Social = lazy(() => 
  import('./pages/Social').then(module => ({ default: module.default }))
);

const Events = lazy(() => 
  import('./pages/Events').then(module => ({ default: module.default }))
);

const EventDetail = lazy(() =>
  import('./pages/EventDetail').then(module => ({ default: module.default }))
);

const Challenges = lazy(() => 
  import('./pages/Challenges').then(module => ({ default: module.default }))
);

const Messages = lazy(() => 
  import('./pages/Messages').then(module => ({ default: module.default }))
);

const Profile = lazy(() => 
  import('./pages/Profile').then(module => ({ default: module.default }))
);

const Settings = lazy(() => 
  import('./pages/Settings').then(module => ({ default: module.default }))
);

const MyRegistrations = lazy(() =>
  import('./pages/MyRegistrations').then(module => ({ default: module.default }))
);

const Admin = lazy(() => 
  import('./pages/Admin').then(module => ({ default: module.default }))
);

const PerformanceMonitor = lazy(() => 
  import('./pages/admin/PerformanceMonitor').then(module => ({ default: module.default }))
);

const QRScanner = lazy(() => 
  import('./pages/QRScanner').then(module => ({ default: module.default }))
);

const Insights = lazy(() => 
  import('./pages/Insights').then(module => ({ default: module.default }))
);

const OrganizationAdmin = lazy(() => 
  import('./pages/admin/OrganizationAdmin').then(module => ({ default: module.default }))
);

const SuperAdminDashboard = lazy(() => 
  import('./pages/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    // Initialize PWA features
    const initializePWA = async () => {
      // Register service worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }

      // Initialize notification service
      NotificationService.getInstance().initialize();

      // Add install prompt handler
      let deferredPrompt: any;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button after 30 seconds
        setTimeout(() => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
              deferredPrompt = null;
            });
          }
        }, 30000);
      });
    };

    initializePWA();
  }, []);

  return (
    <CapacitorErrorBoundary>
      <EnhancedErrorBoundary 
        onError={(error, errorInfo) => {
          console.error('Global Error Boundary:', error, errorInfo);
          window.capacitorDebug?.log(`App Error: ${error.message}`, 'error');
        }}
        showDetails={process.env.NODE_ENV === 'development'}
        allowRetry={true}
      >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrandProvider>
            <FeatureFlagsProvider>
              <TenantProvider>
                <BrowserRouter>
                  <AuthProvider>
                    <OrganizationProvider>
                      <RealtimeProvider>
                      <LazyBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <ThemeController />
                        <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        
                        {/* Organization signup routes */}
                        <Route path="/:slug/signup" element={<OrganizationSignup />} />
                        <Route path="/join/:code" element={<InviteJoin />} />
                        
                        {/* Organization creation route - requires auth but not organization */}
                        <Route path="/organization/new" element={
                          <ProtectedRoute requireAuth={true} requireOrganization={false}>
                            <OrganizationOnboarding />
                          </ProtectedRoute>
                        } />
                        
                        {/* Protected routes */}
                        <Route path="/dashboard" element={
                          <ProtectedRoute>
                            <Layout><Dashboard /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/insights" element={
                          <ProtectedRoute>
                            <Layout><Insights /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/social" element={
                          <ProtectedRoute requireFeature="social">
                            <Layout><Social /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/events" element={
                          <ProtectedRoute requireFeature="events">
                            <Layout><Events /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/events/:id" element={
                          <ProtectedRoute requireFeature="events">
                            <Layout><EventDetail /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/challenges" element={
                          <ProtectedRoute requireFeature="challenges">
                            <Layout><Challenges /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                          <ProtectedRoute>
                            <Layout><Profile /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/messages" element={
                          <ProtectedRoute requireFeature="messaging">
                            <Layout><Messages /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/my/registrations" element={
                          <ProtectedRoute>
                            <Layout><MyRegistrations /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                          <ProtectedRoute requireAdmin>
                            <Layout><Admin /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/admin/performance" element={
                          <ProtectedRoute requireAdmin>
                            <Layout><PerformanceMonitor /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/admin/organization" element={
                          <ProtectedRoute requireAdmin>
                            <Layout><OrganizationAdmin /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/super-admin" element={
                          <ProtectedRoute requireSuperAdmin>
                            <SuperAdminDashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                          <ProtectedRoute>
                            <Layout><Settings /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/settings/:section" element={
                          <ProtectedRoute>
                            <Layout><Settings /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="/qr-scanner" element={
                          <ProtectedRoute>
                            <Layout><QRScanner /></Layout>
                          </ProtectedRoute>
                        } />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                    </LazyBoundary>
                      </RealtimeProvider>
                    </OrganizationProvider>
                  </AuthProvider>
                </BrowserRouter>
            </TenantProvider>
          </FeatureFlagsProvider>
        </BrandProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </EnhancedErrorBoundary>
    </CapacitorErrorBoundary>
  );
};

export default App;
