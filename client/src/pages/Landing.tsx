import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-industry text-white text-2xl"></i>
            </div>
            <div>
              <h1 className="font-inter font-bold text-4xl text-neutral-900">ProSync Hub</h1>
              <p className="text-neutral-600 text-lg">Industrial Asset Management Platform</p>
            </div>
          </div>
          <p className="text-neutral-700 text-xl max-w-2xl mx-auto">
            Streamline your industrial operations with real-time asset monitoring, 
            predictive maintenance, and collaborative work order management.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-neutral-200">
            <CardHeader>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-cogs text-primary-500 text-xl"></i>
              </div>
              <CardTitle className="text-lg">Asset Management</CardTitle>
              <CardDescription>
                Comprehensive asset registry with real-time monitoring and hierarchical organization
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-clipboard-list text-secondary-500 text-xl"></i>
              </div>
              <CardTitle className="text-lg">Work Orders</CardTitle>
              <CardDescription>
                Streamlined maintenance workflows with assignment tracking and status updates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader>
              <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-accent-500 text-xl"></i>
              </div>
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>
                Real-time dashboards and predictive maintenance insights for optimal performance
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-neutral-200 max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Access your industrial asset management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3"
              size="lg"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
