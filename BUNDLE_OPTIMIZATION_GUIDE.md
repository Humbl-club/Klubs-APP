# 📦 Bundle Size Optimization Guide

## Current Bundle Analysis

### Main Bundle: 768KB (gzip: 230KB)
**Status**: Acceptable but optimizable to < 500KB

## 🎯 Optimization Strategies

### 1. **Remove Unused Mobile Pages** (Save ~100KB)
These 7 pages are NEVER imported and can be safely deleted:
```bash
# Delete unused mobile pages
rm client/src/pages/MobileEventsPage.tsx
rm client/src/pages/MobileMessagesPage.tsx  
rm client/src/pages/MobileProfilePage.tsx
rm client/src/pages/MobileSettingsPage.tsx
rm client/src/pages/MobileSocialPage.tsx
rm client/src/pages/AdminMobilePage.tsx
rm client/src/pages/MobileFirstIndex.tsx
```

### 2. **Remove Unused Packages** (Save ~150KB)
```bash
npm uninstall wouter passport passport-local express-session memorystore postgres connect-pg-simple @types/passport @types/passport-local @types/express-session @types/pg @types/connect-pg-simple
```

### 3. **Optimize Heavy Dependencies**

#### Replace Recharts with Lightweight Alternative (Save ~200KB)
Current: `recharts` (372KB bundle)
Alternative: `chart.js` or `frappe-charts` (~50KB)

```bash
# Replace Recharts
npm uninstall recharts
npm install frappe-charts
```

#### Tree-shake Radix UI Components
Only import what you use:
```typescript
// Bad
import * as Dialog from '@radix-ui/react-dialog';

// Good  
import { Dialog, DialogContent } from '@radix-ui/react-dialog';
```

### 4. **Code Splitting Improvements**

#### Lazy Load Admin Routes (Save ~147KB from main bundle)
```typescript
// Routes.tsx
const Admin = lazy(() => import('./pages/Admin'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
```

#### Split Payment Components
```typescript
// Lazy load payment modal
const PaymentModal = lazy(() => import('./components/payment/PaymentModal'));
```

### 5. **Image Optimization**

#### Use WebP with fallbacks
```typescript
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

#### Lazy load images below fold
```typescript
<img loading="lazy" src={imageUrl} />
```

### 6. **Bundle Analysis Commands**

```bash
# Analyze bundle composition
npx vite-bundle-visualizer

# Check for duplicate dependencies
npm ls --depth=0 | grep -E "deduped"

# Find large modules
npm ls --parseable --depth=0 | xargs -I {} sh -c 'echo "{}: $(du -sh node_modules/{} 2>/dev/null | cut -f1)"'
```

### 7. **Vite Configuration Optimizations**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### 8. **Dynamic Imports for Heavy Features**

```typescript
// Lazy load charts only when needed
const loadCharts = async () => {
  const { BarChart } = await import('./components/charts/BarChart');
  return BarChart;
};

// Lazy load QR scanner
const QRScanner = lazy(() => import('./components/QRScanner'));
```

### 9. **Trim Dev‑Only Tooling**
Audit and remove any unused dev‑only toolchains to reduce install time and transitive deps.

### 10. **Use Production React Build**
Ensure production mode:
```bash
NODE_ENV=production npm run build
```

## 📊 Expected Results

### After All Optimizations:
- **Main Bundle**: ~400KB (from 768KB)
- **Gzipped**: ~120KB (from 230KB)
- **Load Time**: < 1s on 4G
- **Performance Score**: 95+ on Lighthouse

## 🚀 Quick Implementation

### Phase 1 (Quick Wins - 1 hour) 
1. Delete unused mobile pages
2. Remove unused packages
3. Remove any unused dev‑only tooling

**Expected Savings**: ~300KB

### Phase 2 (Medium Effort - 2-3 hours)  
1. Implement code splitting for admin
2. Lazy load heavy components
3. Configure Vite chunking

**Expected Savings**: ~200KB

### Phase 3 (Larger Refactor - 4-5 hours)
1. Replace Recharts with lightweight alternative
2. Optimize all images to WebP
3. Tree-shake all dependencies

**Expected Savings**: ~250KB

## 🎯 Mobile-First Priority

For mobile optimization, prioritize:
1. **Initial bundle < 150KB gzipped** - Critical for 3G/4G
2. **Lazy load everything below fold**
3. **Preload critical fonts and styles**
4. **Use native lazy loading for images**

## Monitoring Bundle Size

Add to package.json:
```json
{
  "scripts": {
    "analyze": "vite-bundle-visualizer",
    "size": "vite build --mode production && du -sh dist"
  }
}
```

Regular checks:
```bash
# Check bundle size after builds
npm run size

# Detailed analysis
npm run analyze
```
