import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { 
  markAsRead, 
  markAllAsRead, 
  removeNotification, 
  setNotifications,
  setLoading,
  setError
} from "@/store/slices/notificationSlice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// Define a type for notifications
interface NotificationItem {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: "info" | "error" | "warning" | "success";
  isRead: boolean;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdAt: string;
}

export default function Notifications() {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading, error } = useSelector(
    (state: RootState) => state.notifications
  );
  const [activeTab, setActiveTab] = useState<string>("all");

  // Simulate fetching notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        dispatch(setLoading(true));
        // This would be an actual API call in a real app
        // const response = await fetch('/api/notifications');
        // const data = await response.json();
        
        // For now, we'll use mock data
        const mockNotifications: NotificationItem[] = [
          {
            id: 1,
            userId: "user1",
            title: "Maintenance Alert",
            message: "Pump P-101 vibration levels exceeding threshold",
            type: "warning",
            isRead: false,
            relatedEntityType: "asset",
            relatedEntityId: 101,
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
          },
          {
            id: 2,
            userId: "user1",
            title: "Work Order Completed",
            message: "WO-2023-056 marked as complete by John Smith",
            type: "success",
            isRead: false,
            relatedEntityType: "workOrder",
            relatedEntityId: 56,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          },
          {
            id: 3,
            userId: "user1",
            title: "System Update",
            message: "ProSyncHub has been updated to version 2.3.0",
            type: "info",
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          },
          {
            id: 4,
            userId: "user1",
            title: "Inventory Alert",
            message: "Bearing SKF-6205 inventory below minimum threshold",
            type: "error",
            isRead: false,
            relatedEntityType: "inventory",
            relatedEntityId: 6205,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          },
          {
            id: 5,
            userId: "user1",
            title: "Scheduled Maintenance",
            message: "Scheduled maintenance for Air Compressor AC-201 due tomorrow",
            type: "info",
            isRead: true,
            relatedEntityType: "maintenance",
            relatedEntityId: 42,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
          },
        ];
        
        dispatch(setNotifications(mockNotifications));
      } catch (err) {
        dispatch(setError("Failed to fetch notifications"));
        toast.error("Failed to load notifications");
      }
    };

    fetchNotifications();
  }, [dispatch]);

  const handleMarkAsRead = (id: number) => {
    dispatch(markAsRead(id));
    toast.success("Notification marked as read");
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
    toast.success("All notifications marked as read");
  };

  const handleRemoveNotification = (id: number) => {
    dispatch(removeNotification(id));
    toast.success("Notification removed");
  };

  // Fallback for notifications array
  const notificationsArr: NotificationItem[] = Array.isArray(notifications) ? notifications : [];
  const filteredNotifications = notificationsArr.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.isRead;
    return notification.type === activeTab;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info":
        return <i className="fas fa-info-circle text-blue-500"></i>;
      case "warning":
        return <i className="fas fa-exclamation-triangle text-amber-500"></i>;
      case "error":
        return <i className="fas fa-times-circle text-red-500"></i>;
      case "success":
        return <i className="fas fa-check-circle text-green-500"></i>;
      default:
        return <i className="fas fa-bell text-neutral-500"></i>;
    }
  };

  const getRelatedEntityLink = (notification: any) => {
    if (!notification.relatedEntityType || !notification.relatedEntityId) {
      return null;
    }

    let path = "/";
    let label = "";

    switch (notification.relatedEntityType) {
      case "asset":
        path = `/assets/${notification.relatedEntityId}`;
        label = "View Asset";
        break;
      case "workOrder":
        path = `/work-orders/${notification.relatedEntityId}`;
        label = "View Work Order";
        break;
      case "maintenance":
        path = `/maintenance/tasks/${notification.relatedEntityId}`;
        label = "View Task";
        break;
      case "inventory":
        path = `/inventory/items/${notification.relatedEntityId}`;
        label = "View Item";
        break;
      default:
        return null;
    }

    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2" 
        onClick={() => {
          window.location.href = path;
        }}
      >
        {label}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-red-500">
              <i className="fas fa-exclamation-circle mr-2"></i>
              Error
            </CardTitle>
            <CardDescription>Failed to load notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>
              <i className="fas fa-redo mr-2"></i>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-neutral-600">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`
              : "No new notifications"}
          </p>
        </div>
        <div className="flex space-x-3">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <i className="fas fa-check-double mr-2"></i>
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 bg-primary-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="warning">Warnings</TabsTrigger>
            <TabsTrigger value="error">Errors</TabsTrigger>
            <TabsTrigger value="success">Success</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab}>
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <i className="fas fa-bell-slash text-neutral-400 text-5xl mb-4"></i>
                  <p className="text-neutral-600">No notifications found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all ${
                    !notification.isRead
                      ? "border-l-4 border-l-primary-500"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {getTypeIcon(notification.type)}
                        </div>
                        <CardTitle className="text-lg font-medium">
                          {notification.title}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <i className="fas fa-ellipsis-v"></i>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.isRead && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <i className="fas fa-check mr-2"></i>
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleRemoveNotification(notification.id)
                            }
                            className="text-red-500"
                          >
                            <i className="fas fa-trash mr-2"></i>
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-700">{notification.message}</p>
                    {getRelatedEntityLink(notification)}
                  </CardContent>
                  <CardFooter className="pt-0 pb-3 text-neutral-500 text-sm">
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
