import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MaintenanceTask {
  id: number;
  assetId: number;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  assignedToUserId?: string;
  checklist?: {
    id: number;
    items: Array<{
      id: number;
      description: string;
      isCompleted: boolean;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceState {
  tasks: MaintenanceTask[];
  selectedTask: MaintenanceTask | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
    assetId?: number;
    assignedToUserId?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

const initialState: MaintenanceState = {
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,
  filters: {},
};

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<MaintenanceTask[]>) => {
      state.tasks = action.payload;
      state.loading = false;
      state.error = null;
    },
    addTask: (state, action: PayloadAction<MaintenanceTask>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<MaintenanceTask>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = action.payload;
      }
    },
    removeTask: (state, action: PayloadAction<number>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
      if (state.selectedTask?.id === action.payload) {
        state.selectedTask = null;
      }
    },
    setSelectedTask: (state, action: PayloadAction<MaintenanceTask | null>) => {
      state.selectedTask = action.payload;
    },
    updateChecklistItem: (state, action: PayloadAction<{taskId: number, itemId: number, isCompleted: boolean}>) => {
      const { taskId, itemId, isCompleted } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      
      if (task && task.checklist) {
        const item = task.checklist.items.find(i => i.id === itemId);
        if (item) {
          item.isCompleted = isCompleted;
        }
      }

      if (state.selectedTask?.id === taskId && state.selectedTask.checklist) {
        const item = state.selectedTask.checklist.items.find(i => i.id === itemId);
        if (item) {
          item.isCompleted = isCompleted;
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setFilters: (state, action: PayloadAction<Partial<MaintenanceState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setTasks,
  addTask,
  updateTask,
  removeTask,
  setSelectedTask,
  updateChecklistItem,
  setLoading,
  setError,
  setFilters,
  clearFilters,
} = maintenanceSlice.actions;

export default maintenanceSlice.reducer;
