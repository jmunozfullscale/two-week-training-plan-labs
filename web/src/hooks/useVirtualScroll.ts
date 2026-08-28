import { useState, useCallback, type UIEvent } from 'react';

interface UseVirtualScrollOptions {
  totalItems: number;
  rowHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll({
  totalItems,
  rowHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const rawStartIndex = Math.floor(scrollTop / rowHeight);

  const startIndex = Math.max(0, rawStartIndex - overscan);
  const endIndex = Math.min(totalItems, rawStartIndex + visibleCount + overscan);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalItems - endIndex) * rowHeight);

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    handleScroll,
    scrollTop,
  };
}
