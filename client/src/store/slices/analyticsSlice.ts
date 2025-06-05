import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the structure for a data point in our time series
interface DataPoint {
  timestamp: string;
  value: number;
  status?: 'normal' | 'warning' | 'critical';
}

// Define the structure for a time series data set
interface TimeSeriesData {
  id: string;
  assetId: number;
  sensorId: string;
  sensorType: string;
  unit: string;
  dataPoints: DataPoint[];
  metadata?: Record<string, any>;
}

// Define alert thresholds for sensors
interface SensorThreshold {
  sensorType: string;
  warningThreshold: number;
  criticalThreshold: number;
}

// Define the analytics state shape
interface AnalyticsState {
  timeSeriesData: Record<string, TimeSeriesData>; // Indexed by sensorId for quick lookup
  thresholds: SensorThreshold[];
  activeAssetId: number | null;
  activeSensorIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
  loading: boolean;
  error: string | null;
}

// Set default date range to last 7 days
const today = new Date();
const weekAgo = new Date();
weekAgo.setDate(today.getDate() - 7);

const initialState: AnalyticsState = {
  timeSeriesData: {},
  thresholds: [],
  activeAssetId: null,
  activeSensorIds: [],
  dateRange: {
    start: weekAgo.toISOString(),
    end: today.toISOString(),
  },
  interval: 'hour',
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setTimeSeriesData: (state, action: PayloadAction<TimeSeriesData[]>) => {
      // Convert array to record indexed by sensorId
      action.payload.forEach(series => {
        state.timeSeriesData[series.sensorId] = series;
      });
      state.loading = false;
    },
    addTimeSeriesData: (state, action: PayloadAction<TimeSeriesData>) => {
      state.timeSeriesData[action.payload.sensorId] = action.payload;
    },
    updateTimeSeriesData: (state, action: PayloadAction<{sensorId: string, dataPoints: DataPoint[]}>) => {
      const { sensorId, dataPoints } = action.payload;
      if (state.timeSeriesData[sensorId]) {
        state.timeSeriesData[sensorId].dataPoints = dataPoints;
      }
    },
    addDataPoint: (state, action: PayloadAction<{sensorId: string, dataPoint: DataPoint}>) => {
      const { sensorId, dataPoint } = action.payload;
      if (state.timeSeriesData[sensorId]) {
        state.timeSeriesData[sensorId].dataPoints.push(dataPoint);
        
        // Sort by timestamp to ensure chronological order
        state.timeSeriesData[sensorId].dataPoints.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    },
    setThresholds: (state, action: PayloadAction<SensorThreshold[]>) => {
      state.thresholds = action.payload;
    },
    setActiveAssetId: (state, action: PayloadAction<number | null>) => {
      state.activeAssetId = action.payload;
      // Clear active sensors when asset changes
      state.activeSensorIds = [];
    },
    setActiveSensorIds: (state, action: PayloadAction<string[]>) => {
      state.activeSensorIds = action.payload;
    },
    addActiveSensorId: (state, action: PayloadAction<string>) => {
      if (!state.activeSensorIds.includes(action.payload)) {
        state.activeSensorIds.push(action.payload);
      }
    },
    removeActiveSensorId: (state, action: PayloadAction<string>) => {
      state.activeSensorIds = state.activeSensorIds.filter(id => id !== action.payload);
    },
    setDateRange: (state, action: PayloadAction<{start: string, end: string}>) => {
      state.dateRange = action.payload;
    },
    setInterval: (state, action: PayloadAction<AnalyticsState['interval']>) => {
      state.interval = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAllData: (state) => {
      state.timeSeriesData = {};
      state.activeSensorIds = [];
    }
  },
});

export const {
  setTimeSeriesData,
  addTimeSeriesData,
  updateTimeSeriesData,
  addDataPoint,
  setThresholds,
  setActiveAssetId,
  setActiveSensorIds,
  addActiveSensorId,
  removeActiveSensorId,
  setDateRange,
  setInterval,
  setLoading,
  setError,
  clearAllData,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
