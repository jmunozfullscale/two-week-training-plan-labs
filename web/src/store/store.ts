import { configureStore } from '@reduxjs/toolkit';
import allocationsReducer from './allocationsSlice';

export const store = configureStore({
  reducer: {
    allocations: allocationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
