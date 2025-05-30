import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Asset {
  id: number;
  assetTag: string;
  name: string;
  description?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  locationId: number;
  assetTypeId: number;
  parentAssetId?: number;
  currentStatus: 'operational' | 'maintenance' | 'offline' | 'error';
  createdAt: string;
  updatedAt: string;
}

interface AssetState {
  assets: Asset[];
  selectedAsset: Asset | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    locationId?: number;
    assetTypeId?: number;
  };
}

const initialState: AssetState = {
  assets: [],
  selectedAsset: null,
  loading: false,
  error: null,
  filters: {},
};

const assetSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setAssets: (state, action: PayloadAction<Asset[]>) => {
      state.assets = action.payload;
      state.loading = false;
      state.error = null;
    },
    addAsset: (state, action: PayloadAction<Asset>) => {
      state.assets.push(action.payload);
    },
    updateAsset: (state, action: PayloadAction<Asset>) => {
      const index = state.assets.findIndex(asset => asset.id === action.payload.id);
      if (index !== -1) {
        state.assets[index] = action.payload;
      }
      if (state.selectedAsset?.id === action.payload.id) {
        state.selectedAsset = action.payload;
      }
    },
    removeAsset: (state, action: PayloadAction<number>) => {
      state.assets = state.assets.filter(asset => asset.id !== action.payload);
      if (state.selectedAsset?.id === action.payload) {
        state.selectedAsset = null;
      }
    },
    setSelectedAsset: (state, action: PayloadAction<Asset | null>) => {
      state.selectedAsset = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setFilters: (state, action: PayloadAction<Partial<AssetState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setAssets,
  addAsset,
  updateAsset,
  removeAsset,
  setSelectedAsset,
  setLoading,
  setError,
  setFilters,
  clearFilters,
} = assetSlice.actions;

export default assetSlice.reducer;
