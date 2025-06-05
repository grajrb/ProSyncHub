import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { queryClient } from "./lib/queryClient";
import { store } from "./store";
import ToasterComponent from "@/components/ui/ToasterComponent";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Assets from "@/pages/Assets";
import WorkOrders from "@/pages/WorkOrders";
import Maintenance from "@/pages/Maintenance";
import Analytics from "@/pages/Analytics";
import AnalyticsSensors from "@/pages/AnalyticsSensors";
import AnalyticsReports from "@/pages/AnalyticsReports";
import AnalyticsPredictions from "@/pages/AnalyticsPredictions";
import Notifications from "@/pages/Notifications";
import Chat from "@/pages/Chat";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/" nest>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/assets">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'viewer']}>
                  <Assets />
                </ProtectedRoute>
              </Route>
              <Route path="/work-orders">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                  <WorkOrders />
                </ProtectedRoute>
              </Route>
              <Route path="/maintenance">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                  <Maintenance />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'analyst']}>
                  <Analytics />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics/sensors">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'analyst', 'technician']}>
                  <AnalyticsSensors />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics/reports">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'analyst']}>
                  <AnalyticsReports />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics/predictions">
                <ProtectedRoute allowedRoles={['admin', 'manager', 'analyst']}>
                  <AnalyticsPredictions />
                </ProtectedRoute>
              </Route>
              <Route path="/notifications" component={Notifications} />
              <Route path="/chat" component={Chat} />
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Layout>
        </Route>
      )}
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToasterComponent />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
