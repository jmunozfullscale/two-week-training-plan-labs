import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setFilterText,
  selectFilteredAllocations,
  selectFilterText,
  selectRawAllocations,
} from '../../store/allocationsSlice';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { AllocationRow } from './AllocationRow';
import './AllocationsGrid.css';

const ROW_HEIGHT = 46;
const CONTAINER_HEIGHT = 500;

export function AllocationsGrid() {
  const dispatch = useDispatch();
  const rawItems = useSelector(selectRawAllocations);
  const filterText = useSelector(selectFilterText);
  const filteredItems = useSelector(selectFilteredAllocations);

  // Local state for smooth 60fps typing
  const [localInputText, setLocalInputText] = useState(filterText);

  const gridRenderCountRef = useRef(0);
  gridRenderCountRef.current += 1;

  // STAGE 2: DEBOUNCED FILTER INPUT (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilterText(localInputText));
    }, 250);

    return () => clearTimeout(timer);
  }, [localInputText, dispatch]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalInputText(e.target.value);
  };

  // STAGE 3: PLAIN TABLE ROW VIRTUALIZATION
  // Dynamically computes visible item slice and top/bottom spacer heights to render ~20 rows instead of 5,000
  const { startIndex, endIndex, topPadding, bottomPadding, handleScroll } = useVirtualScroll({
    totalItems: filteredItems.length,
    rowHeight: ROW_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 6,
  });

  const visibleItems = filteredItems.slice(startIndex, endIndex);

  return (
    <div className="grid-page-container">
      <div className="grid-header">
        <div>
          <h2>Day 7: Allocations Grid — Stage 3</h2>
          <p className="subtitle">
            Optimizations: Memoized selectors &bull; Debounced filter input &bull; Table row virtualization (Fully Optimized)
          </p>
        </div>
        <div className="render-counter">
          Grid Renders: <span className="render-badge">{gridRenderCountRef.current}</span>
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="stats-banner">
        <div className="stat">
          <span className="stat-label">Total State Items</span>
          <span className="stat-value">{rawItems.length.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Filtered Matches</span>
          <span className="stat-value">{filteredItems.length.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">DOM Nodes Rendered</span>
          <span className="stat-value low-dom">{visibleItems.length.toLocaleString()} rows</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Filter allocations by device, engineer, location, status..."
            value={localInputText}
            onChange={handleInputChange}
          />
          {localInputText && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                setLocalInputText('');
                dispatch(setFilterText(''));
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* VIRTUALIZED TABLE CONTAINER */}
      <div
        className="table-scroll-container"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={handleScroll}
      >
        <table className="allocations-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-device">Device Name</th>
              <th className="col-engineer">Engineer</th>
              <th className="col-location">Location</th>
              <th className="col-priority">Priority</th>
              <th className="col-status">Status</th>
              <th className="col-dates">Scheduled Window</th>
            </tr>
          </thead>
          <tbody>
            {topPadding > 0 && <tr style={{ height: topPadding }} aria-hidden="true" />}
            {visibleItems.map((item) => (
              <AllocationRow key={item.id} item={item} />
            ))}
            {bottomPadding > 0 && <tr style={{ height: bottomPadding }} aria-hidden="true" />}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="no-results">
                  No allocations matching "{localInputText}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
