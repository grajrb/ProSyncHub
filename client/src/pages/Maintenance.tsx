import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RootState } from "@/store";
import { setTasks, setSelectedTask } from "@/store/slices/maintenanceSlice";
import CreateMaintenanceTaskDialog from "@/components/maintenance/CreateMaintenanceTaskDialog";
 import MaintenanceTaskList from "@/components/maintenance/MaintenanceTaskList";
 import MaintenanceTaskDetails from "@/components/maintenance/MaintenanceTaskDetails";
import ScheduleCalendarView from "@/components/maintenance/ScheduleCalendarView";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export default function Maintenance() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  
  const selectedTask = useSelector((state: RootState) => state.maintenance.selectedTask);
  const userRole = user?.roleId || 0;

  // Fetch maintenance tasks
  const { data: tasksRaw, isLoading } = useQuery({
    queryKey: ["/api/maintenance/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/maintenance/tasks");
      if (!response.ok) throw new Error("Failed to fetch maintenance tasks");
      const data = await response.json();
      dispatch(setTasks(data));
      return data;
    },
  });
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];

  // Filter tasks based on active tab
  const getFilteredTasks = (): typeof tasks => {
    if (!Array.isArray(tasks)) return [];
    switch (activeTab) {
      case "scheduled":
        return tasks.filter(task => task.status === "scheduled");
      case "inProgress":
        return tasks.filter(task => task.status === "in_progress");
      case "completed":
        return tasks.filter(task => task.status === "completed");
      case "myTasks":
        return tasks.filter(task => task.assignedToUserId === user?.id);
      default:
        return tasks;
    }
  };

  const canCreateTasks = typeof userRole === 'number' && userRole >= 2; // Assuming role levels (viewer: 1, operator: 2, admin: 3)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Management</h1>
          <p className="text-muted-foreground">
            Schedule, track, and manage maintenance tasks and activities
          </p>
        </div>
        {canCreateTasks && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <i className="fas fa-plus mr-2"></i>
            Create Task
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="inProgress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="myTasks">My Tasks</TabsTrigger>
        </TabsList>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Task Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={setCalendarDate}
                  className="rounded-md border"
                />
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Tasks for {calendarDate?.toLocaleDateString()}</h3>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <ScheduleCalendarView 
                      tasks={tasks || []} 
                      selectedDate={calendarDate} 
                      onSelectTask={(task) => dispatch(setSelectedTask(task))}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <TabsContent value="all" className="mt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MaintenanceTaskList 
                  tasks={getFilteredTasks()} 
                  selectedTaskId={selectedTask?.id !== undefined ? String(selectedTask.id) : undefined}
                  onSelectTask={(task) => dispatch(setSelectedTask(task))}
                />
              )}
            </TabsContent>
            
            <TabsContent value="scheduled" className="mt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MaintenanceTaskList 
                  tasks={getFilteredTasks()} 
                  selectedTaskId={selectedTask?.id !== undefined ? String(selectedTask.id) : undefined}
                  onSelectTask={(task) => dispatch(setSelectedTask(task))}
                />
              )}
            </TabsContent>
            
            <TabsContent value="inProgress" className="mt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MaintenanceTaskList 
                  tasks={getFilteredTasks()} 
                  selectedTaskId={selectedTask?.id !== undefined ? String(selectedTask.id) : undefined}
                  onSelectTask={(task) => dispatch(setSelectedTask(task))}
                />
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MaintenanceTaskList 
                  tasks={getFilteredTasks()} 
                  selectedTaskId={selectedTask?.id !== undefined ? String(selectedTask.id) : undefined}
                  onSelectTask={(task) => dispatch(setSelectedTask(task))}
                />
              )}
            </TabsContent>
            
            <TabsContent value="myTasks" className="mt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <MaintenanceTaskList 
                  tasks={getFilteredTasks()} 
                  selectedTaskId={selectedTask?.id !== undefined ? String(selectedTask.id) : undefined}
                  onSelectTask={(task) => dispatch(setSelectedTask(task))}
                />
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {selectedTask && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTaskDetails 
              task={selectedTask}
              onClose={() => dispatch(setSelectedTask(null))}
              canEdit={userRole >= 2}
            />
          </CardContent>
        </Card>
      )}

      <CreateMaintenanceTaskDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}
