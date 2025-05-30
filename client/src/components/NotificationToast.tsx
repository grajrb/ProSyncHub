import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { connectWebSocket } from "@/lib/websocket";
import { addNotification } from "@/store/slices/notificationSlice";

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const dispatch = useDispatch();

  // Fetch real-time notifications
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", { unreadOnly: true }],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    const ws = connectWebSocket();
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different WebSocket message types
      switch (data.type) {
        case 'ASSET_UPDATED':
          showToast({
            title: "Asset Updated",
            message: `Asset ${data.payload.name} has been updated`,
            type: "info",
          });
          break;
        case 'WORK_ORDER_CREATED':
          showToast({
            title: "New Work Order",
            message: `Work order "${data.payload.title}" has been created`,
            type: "info",
          });
          break;
        case 'WORK_ORDER_ASSIGNED':
          showToast({
            title: "Work Order Assigned",
            message: `Work order "${data.payload.title}" has been assigned`,
            type: "success",
          });
          break;
        case 'SENSOR_READING':
          // Check for critical sensor readings
          if (data.payload.sensorType === 'temperature' && parseFloat(data.payload.value) > 300) {
            showToast({
              title: "Critical Temperature Alert",
              message: `Asset ${data.payload.assetId} temperature: ${data.payload.value}${data.payload.unit}`,
              type: "error",
            });
          }
          break;
        case 'NOTIFICATION':
          showToast({
            title: data.payload.title,
            message: data.payload.message,
            type: data.payload.type || "info",
          });
          dispatch(addNotification(data.payload));
          break;
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    };

    return () => {
      ws.close();
    };
  }, [dispatch]);

  const showToast = (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const toast: ToastNotification = {
      ...notification,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-l-4 border-status-error bg-red-50';
      case 'warning':
        return 'border-l-4 border-status-warning bg-orange-50';
      case 'success':
        return 'border-l-4 border-status-success bg-green-50';
      default:
        return 'border-l-4 border-status-info bg-blue-50';
    }
  };

  const getIconClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'fas fa-exclamation-triangle text-status-error';
      case 'warning':
        return 'fas fa-exclamation-circle text-status-warning';
      case 'success':
        return 'fas fa-check-circle text-status-success';
      default:
        return 'fas fa-info-circle text-status-info';
    }
  };

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50" id="notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyles(toast.type)} 
            shadow-lg rounded-lg p-4 max-w-sm animate-fade-in
            bg-white border border-neutral-200
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <i className={`${getIconClass(toast.type)} mt-1`}></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">{toast.title}</p>
                <p className="text-sm text-neutral-700 mt-1">{toast.message}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  {toast.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-neutral-600 p-1 h-auto"
            >
              <i className="fas fa-times text-xs"></i>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
