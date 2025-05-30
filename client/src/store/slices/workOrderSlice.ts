import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WorkOrder {
  id: number;
  title: string;
  description?: string;
  assetId: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'preventive' | 'corrective' | 'emergency';
  assignedToUserId?: string;
  reportedByUserId: string;
  scheduledDate?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderState {
  workOrders: WorkOrder[];
  selectedWorkOrder: WorkOrder | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
    type?: string;
    assignedToUserId?: string;
    assetId?: number;
  };
}

const initialState: WorkOrderState = {
  workOrders: [],
  selectedWorkOrder: null,
  loading: false,
  error: null,
  filters: {},
};

const workOrderSlice = createSlice({
  name: 'workOrders',
  initialState,
  reducers: {
    setWorkOrders: (state, action: PayloadAction<WorkOrder[]>) => {
      state.workOrders = action.payload;
      state.loading = false;
      state.error = null;
    },
    addWorkOrder: (state, action: PayloadAction<WorkOrder>) => {
      state.workOrders.unshift(action.payload); // Add to beginning for recent first
    },
    updateWorkOrder: (state, action: PayloadAction<WorkOrder>) => {
      const index = state.workOrders.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.workOrders[index] = action.payload;
      }
      if (state.selectedWorkOrder?.id === action.payload.id) {
        state.selectedWorkOrder = action.payload;
      }
    },
    removeWorkOrder: (state, action: PayloadAction<number>) => {
      state.workOrders = state.workOrders.filter(order => order.id !== action.payload);
      if (state.selectedWorkOrder?.id === action.payload) {
        state.selectedWorkOrder = null;
      }
    },
    setSelectedWorkOrder: (state, action: PayloadAction<WorkOrder | null>) => {
      state.selectedWorkOrder = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setFilters: (state, action: PayloadAction<Partial<WorkOrderState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    assignWorkOrder: (state, action: PayloadAction<{ id: number; userId: string }>) => {
      const order = state.workOrders.find(order => order.id === action.payload.id);
      if (order) {
        order.assignedToUserId = action.payload.userId;
        order.updatedAt = new Date().toISOString();
      }
    },
    updateWorkOrderStatus: (state, action: PayloadAction<{ id: number; status: WorkOrder['status'] }>) => {
      const order = state.workOrders.find(order => order.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
        order.updatedAt = new Date().toISOString();
        if (action.payload.status === 'completed') {
          order.completionDate = new Date().toISOString();
        }
      }
    },
  },
});

export const {
  setWorkOrders,
  addWorkOrder,
  updateWorkOrder,
  removeWorkOrder,
  setSelectedWorkOrder,
  setLoading,
  setError,
  setFilters,
  clearFilters,
  assignWorkOrder,
  updateWorkOrderStatus,
} = workOrderSlice.actions;

export default workOrderSlice.reducer;
