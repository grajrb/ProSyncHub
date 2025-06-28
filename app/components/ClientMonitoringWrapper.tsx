'use client';

import dynamic from 'next/dynamic';

// Dynamically import the monitoring to avoid SSR issues
const MonitoringInitializer = dynamic(
  () => import('./MonitoringInitializer'),
  { ssr: false }
);

export default function ClientMonitoringWrapper() {
  return <MonitoringInitializer />;
}
