import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assetReducer from './slices/assetSlice';
import workOrderReducer from './slices/workOrderSlice';
import notificationReducer from './slices/notificationSlice';
import maintenanceReducer from './slices/maintenanceSlice';
import analyticsReducer from './slices/analyticsSlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetReducer,
    workOrders: workOrderReducer,
    notifications: notificationReducer,
    maintenance: maintenanceReducer,
    analytics: analyticsReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
