'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializeMonitoring, trackPageView } from '@/app/lib/monitoring';

/**
 * Component that initializes monitoring and tracks page views
 * This should be used on the client-side only, not during SSR
 */
export default function MonitoringInitializer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize monitoring on component mount
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true') {
      initializeMonitoring();
    }
  }, []);
  
  // Track page views when route changes
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'true') {
      return;
    }
    
    // Create URL from pathname and search params
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    // Get page name from pathname
    const pageName = pathname.split('/').filter(Boolean).pop() || 'home';
    const formattedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Track page view
    trackPageView(`ProSync Hub - ${formattedPageName}`, url);
  }, [pathname, searchParams]);
  
  // This component doesn't render anything visible
  return null;
}
