import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.girlsclub', // Change this to your unique identifier
  appName: 'Girls Club Platform',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    allowsLinkPreview: true,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#6366f1'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      style: 'default',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    }
  },
  server: {
    cleartext: false,
    allowNavigation: [
      'https://ynqdddwponrqwhtqfepi.supabase.co',
      'https://*.stripe.com',
      'https://maps.googleapis.com'
    ]
  }
};

export default config;