export interface AllocationGridItem {
  id: number;
  deviceName: string;
  engineerName: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  startDate: string;
  endDate: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  notes: string;
}

const DEVICES = [
  'iPhone 15 Pro',
  'iPhone 16',
  'iPhone 16 Pro Max',
  'iPad A16',
  'Google Pixel 9',
  'Samsung S25 Ultra',
  'Microsoft Surface',
  'Macbook Pro 16',
];

const ENGINEERS = [
  'Juan Carlos Munoz',
  'Areli Abalos',
  'Ben Johns',
  'Rocky Balboa',
  'Manny Pacquiao',
  'Roger Federer',
  'Dirk Nowitzki',
  'Bruce Wayne',
];

const LOCATIONS = [
  'Makati',
  'Cebu',
  'Seattle',
  'Kansas',
  'Sanctum of the Divine',
  'Gotham',
];

const PRIORITIES: AllocationGridItem['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: AllocationGridItem['status'][] = ['Confirmed', 'Completed', 'Cancelled'];

export function generateMockAllocations(count: number): AllocationGridItem[] {
  const items: AllocationGridItem[] = [];

  for (let i = 1; i <= count; i++) {
    const device = DEVICES[i % DEVICES.length]!;
    const engineer = ENGINEERS[i % ENGINEERS.length]!;
    const location = LOCATIONS[i % LOCATIONS.length]!;
    const priority = PRIORITIES[i % PRIORITIES.length]!;
    const status = STATUSES[i % STATUSES.length]!;

    const dayStart = 1 + (i % 28);
    const dayEnd = Math.min(28, dayStart + 2);
    const startDate = `2026-09-${String(dayStart).padStart(2, '0')}T08:00`;
    const endDate = `2026-09-${String(dayEnd).padStart(2, '0')}T17:00`;

    items.push({
      id: i,
      deviceName: `${device} #${i}`,
      engineerName: engineer,
      location,
      priority,
      startDate,
      endDate,
      status,
      notes: `Batch allocation #${i} scheduled for stress and validation run.`,
    });
  }

  return items;
}
