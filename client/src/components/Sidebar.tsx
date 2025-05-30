import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch unread notifications count
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", { unreadOnly: true }],
  });

  // Fetch pending work orders count
  const { data: workOrders } = useQuery({
    queryKey: ["/api/work-orders", { status: "open" }],
  });

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const menuItems = [
    {
      path: "/",
      icon: "fas fa-tachometer-alt",
      label: "Dashboard",
    },
    {
      path: "/assets",
      icon: "fas fa-cogs",
      label: "Assets",
      hasSubmenu: true,
      submenu: [
        { path: "/assets", label: "All Assets" },
        { path: "/assets/hierarchy", label: "Asset Hierarchy" },
        { path: "/assets/locations", label: "Locations" },
      ],
    },
    {
      path: "/work-orders",
      icon: "fas fa-clipboard-list",
      label: "Work Orders",
      badge: workOrders?.length || 0,
    },
    {
      path: "/maintenance",
      icon: "fas fa-calendar-alt",
      label: "Maintenance",
    },
    {
      path: "/analytics",
      icon: "fas fa-chart-line",
      label: "Analytics",
    },
    {
      path: "/team",
      icon: "fas fa-users",
      label: "Team",
    },
  ];

  return (
    <aside className="bg-neutral-850 text-white w-64 flex-shrink-0 hidden lg:flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-neutral-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-industry text-white text-lg"></i>
          </div>
          <div>
            <h1 className="font-inter font-bold text-lg">ProSync Hub</h1>
            <p className="text-neutral-300 text-sm">Asset Management</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-4">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64"} 
            alt="User Avatar" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-sm">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-neutral-300 text-xs">Plant Supervisor</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.path}>
            <Link
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-primary-600 text-white"
                  : "hover:bg-neutral-700"
              }`}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge className="ml-auto bg-accent-500 text-white text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.hasSubmenu && (
                <i className="fas fa-chevron-down ml-auto text-xs"></i>
              )}
            </Link>
            
            {item.hasSubmenu && isActive(item.path) && (
              <div className="ml-6 space-y-1 mt-1">
                {item.submenu?.map((subItem) => (
                  <Link
                    key={subItem.path}
                    href={subItem.path}
                    className="flex items-center space-x-3 px-3 py-1 text-sm text-neutral-300 hover:text-white"
                  >
                    <span>{subItem.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-neutral-700">
        <Link
          href="/settings"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          <i className="fas fa-cog w-5"></i>
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
