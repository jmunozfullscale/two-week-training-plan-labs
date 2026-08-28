import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { generateMockAllocations, type AllocationGridItem } from '../utils/generateMockAllocations';

export interface AllocationsState {
  items: AllocationGridItem[];
  filterText: string;
}

const initialState: AllocationsState = {
  items: generateMockAllocations(5000),
  filterText: '',
};

export const allocationsSlice = createSlice({
  name: 'allocations',
  initialState,
  reducers: {
    setFilterText: (state, action: PayloadAction<string>) => {
      state.filterText = action.payload;
    },
  },
});

export const { setFilterText } = allocationsSlice.actions;

export const selectRawAllocations = (state: { allocations: AllocationsState }) => state.allocations.items;
export const selectFilterText = (state: { allocations: AllocationsState }) => state.allocations.filterText;

// STAGE 1: RTK MEMOIZED SELECTOR (createSelector)
// Memoizes filtered allocations so array reference remains stable unless items or filterText change.
export const selectFilteredAllocations = createSelector(
  [selectRawAllocations, selectFilterText],
  (items, filterText) => {
    const query = filterText.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.deviceName.toLowerCase().includes(query) ||
        item.engineerName.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.priority.toLowerCase().includes(query)
    );
  }
);

export default allocationsSlice.reducer;
