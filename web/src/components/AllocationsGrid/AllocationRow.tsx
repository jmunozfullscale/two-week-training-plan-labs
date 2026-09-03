import type { AllocationGridItem } from '../../utils/generateMockAllocations';

export interface AllocationRowProps {
  item: AllocationGridItem;
}

// STAGE 0 (BASELINE): Plain, UN-MEMOIZED Table Row Component
export function AllocationRow({ item }: AllocationRowProps) {
  const getPriorityBadgeClass = (priority: AllocationGridItem['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'badge priority-critical';
      case 'High':
        return 'badge priority-high';
      case 'Medium':
        return 'badge priority-medium';
      default:
        return 'badge priority-low';
    }
  };

  const getStatusBadgeClass = (status: AllocationGridItem['status']) => {
    switch (status) {
      case 'Confirmed':
        return 'badge status-active';
      case 'Completed':
        return 'badge status-completed';
      case 'Cancelled':
        return 'badge status-maintenance';
      default:
        return 'badge status-completed';
    }
  };

  return (
    <tr className="allocation-row" data-id={item.id}>
      <td className="col-id">#{item.id}</td>
      <td className="col-device font-medium">{item.deviceName}</td>
      <td className="col-engineer">{item.engineerName}</td>
      <td className="col-location">{item.location}</td>
      <td className="col-priority">
        <span className={getPriorityBadgeClass(item.priority)}>{item.priority}</span>
      </td>
      <td className="col-status">
        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
      </td>
      <td className="col-dates text-muted">
        {item.startDate.replace('T', ' ')} &rarr; {item.endDate.replace('T', ' ')}
      </td>
    </tr>
  );
}
