/**
 * Monitoring and error tracking for the frontend application
 * Configures Application Insights for React applications
 */

import React from 'react';
import { JSX } from 'react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { createBrowserHistory } from 'history';

const browserHistory = createBrowserHistory();
const reactPlugin = new ReactPlugin();

// Initialize Application Insights if enabled
let appInsights: ApplicationInsights | null = null;

/**
 * Initialize the monitoring and error tracking system
 */
export const initializeMonitoring = () => {
  // Only initialize if explicitly enabled
  if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'true') {
    return null;
  }
  
  const connectionString = process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('Application Insights connection string not provided. Monitoring disabled.');
    return null;
  }
  
  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        enableAutoRouteTracking: true,
        enableAjaxErrorStatusText: true,
        enableAjaxPerfTracking: true,
        extensions: [reactPlugin],
        extensionConfig: {
          [reactPlugin.identifier]: { history: browserHistory }
        }
      }
    });
    
    appInsights.loadAppInsights();
    appInsights.trackPageView(); // Track initial page view
    
    return { appInsights, reactPlugin };
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
    return null;
  }
};
/**
 * Track a custom event with Application Insights
 */
export const trackEvent = (name: string, properties: Record<string, any> = {}) => {
  if (appInsights) {
    appInsights.trackEvent({ name }, properties);
  }
};

/**
 * Track a page view with Application Insights
 */
export const trackPageView = (name: string, url: string) => {
  if (appInsights) {
    appInsights.trackPageView({ name, uri: url });
  }
};

/**
 * Track a custom metric with Application Insights
 */
export const trackMetric = (name: string, value: number, properties: Record<string, any> = {}) => {
  if (appInsights) {
    appInsights.trackMetric({ name, average: value }, properties);
  }
};

/**
 * Track an exception with Application Insights
 */
export const trackException = (error: Error, properties: Record<string, any> = {}) => {
  if (appInsights) {
    appInsights.trackException({ exception: error }, properties);
  }
};

/**
 * Track an API call or other dependency with Application Insights
 */
export const trackDependency = (dependency: any) => {
  if (appInsights) {
    appInsights.trackDependencyData(dependency);
  }
};

/**
 * React context to provide access to the monitoring system
 */
export const MonitoringContext = React.createContext<{
    appInsights: ApplicationInsights | null;
    reactPlugin: ReactPlugin | null;
}>({
    appInsights: null,
    reactPlugin: null
});

/**
 * Provider component to make monitoring available throughout the app
 */
interface MonitoringProviderProps {
    children: React.ReactNode;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ children }) => {
    const monitoringTools = React.useMemo(() => {
        if (typeof window !== 'undefined') {
            const tools = initializeMonitoring();
            return {
                appInsights: tools?.appInsights || null,
                reactPlugin: tools?.reactPlugin || null
            };
        }
        return { appInsights: null, reactPlugin: null };
    }, []);

    return (
        <MonitoringContext.Provider value={monitoringTools}>
            {children}
        </MonitoringContext.Provider>
    );
};

/**
 * Hook to use monitoring within functional components
 */
export const useMonitoring = () => React.useContext(MonitoringContext);
/**
 * Custom error boundary component for React that reports errors to Application Insights
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    trackException(error, { errorInfo: errorInfo as any });
  }
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || React.createElement("div", {}, "Something went wrong");
    }
    
    return this.props.children;
  }
  }
}
export { reactPlugin };
export default {
  initializeMonitoring,
  trackEvent,
  trackPageView,
  trackMetric,
  trackException,
  trackDependency,
  MonitoringContext,
  MonitoringProvider,
  useMonitoring,
  ErrorBoundary,
  reactPlugin
};
export default monitoring;
