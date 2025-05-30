import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationToast from "./NotificationToast";

export default function Header() {
  // Fetch unread notifications
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", { unreadOnly: true }],
  });

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <>
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-inter font-semibold text-xl text-neutral-900">Dashboard Overview</h2>
            <p className="text-neutral-600 text-sm">Real-time asset monitoring and management</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <button className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
              <i className="fas fa-bell text-lg"></i>
              {notifications && notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-status-error text-white text-xs h-5 w-5 flex items-center justify-center p-0 rounded-full">
                  {notifications.length}
                </Badge>
              )}
            </button>
            
            {/* Quick Actions */}
            <Button 
              className="bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
            >
              <i className="fas fa-plus mr-2"></i>
              New Work Order
            </Button>

            {/* Logout Button */}
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="text-neutral-600 hover:text-neutral-900"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Notification Toast Container */}
      <NotificationToast />
    </>
  );
}
