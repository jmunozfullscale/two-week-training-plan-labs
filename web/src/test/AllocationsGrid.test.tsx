import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import allocationsReducer, {
  setFilterText,
  selectFilteredAllocations,
} from '../store/allocationsSlice';
import { generateMockAllocations } from '../utils/generateMockAllocations';
import { useVirtualScroll } from '../hooks/useVirtualScroll';
import { AllocationsGrid } from '../components/AllocationsGrid/AllocationsGrid';
import { renderHook } from '@testing-library/react';

describe('Day 7: Performance Grid & Redux Toolkit', () => {
  it('generates 5,000 mock allocation records', () => {
    const items = generateMockAllocations(5000);
    expect(items).toHaveLength(5000);
    expect(items[0].deviceName).toContain('#1');
    expect(items[4999].deviceName).toContain('#5000');
  });

  describe('RTK Selectors & Memoization', () => {
    it('selectFilteredAllocations returns stable reference when state is unchanged', () => {
      const items = generateMockAllocations(5000);
      const state = {
        allocations: {
          items,
          filterText: 'Pixel',
        },
      };

      const result1 = selectFilteredAllocations(state);
      const result2 = selectFilteredAllocations(state);

      expect(result1).toBe(result2);
    });

    it('updates state via Redux Toolkit reducers', () => {
      const store = configureStore({ reducer: { allocations: allocationsReducer } });

      expect(store.getState().allocations.filterText).toBe('');
      store.dispatch(setFilterText('Pixel'));
      expect(store.getState().allocations.filterText).toBe('Pixel');
    });
  });

  describe('Virtual Scroll Hook Windowing', () => {
    it('calculates correct startIndex, endIndex, and padding height', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          totalItems: 5000,
          rowHeight: 46,
          containerHeight: 500,
          overscan: 5,
        })
      );

      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(16);
      expect(result.current.topPadding).toBe(0);
      expect(result.current.bottomPadding).toBe((5000 - 16) * 46);
    });
  });

  describe('AllocationsGrid Component UI', () => {
    it('renders search box, stats banner, and table headers', () => {
      const store = configureStore({ reducer: { allocations: allocationsReducer } });

      render(
        <Provider store={store}>
          <AllocationsGrid />
        </Provider>
      );

      expect(screen.getByText(/Day 7: Allocations Grid/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/filter allocations/i)).toBeInTheDocument();
      expect(screen.getByText('DOM Nodes Rendered')).toBeInTheDocument();
    });

    it('filters rows when text is entered', async () => {
      const store = configureStore({ reducer: { allocations: allocationsReducer } });

      render(
        <Provider store={store}>
          <AllocationsGrid />
        </Provider>
      );

      const searchInput = screen.getByPlaceholderText(/filter allocations/i);

      fireEvent.change(searchInput, { target: { value: 'Pixel' } });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 300));
      });

      expect(store.getState().allocations.filterText).toBe('Pixel');
    });
  });
});
