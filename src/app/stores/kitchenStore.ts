import type { Category } from '../data/menu';
import { menuItems } from '../data/menu';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketStatus = 'preparing' | 'ready' | 'served';
export type OrderSource = 'qr' | 'pos';

export interface TicketItem {
  menuItemId: string;
  name: string;
  quantity: number;
  category: Category;
}

export interface KitchenTicket {
  id: string;
  orderId: string;
  tableLabel: string;
  source: OrderSource;
  items: TicketItem[];
  status: TicketStatus;
  receivedAt: Date;
  statusHistory: { status: TicketStatus; at: Date }[];
  expectedPrepMinutes: number; // max expected prep across item categories
}

export interface StockEntry {
  menuItemId: string;
  name: string;
  category: Category;
  available: boolean;
  markedUnavailableAt?: Date;
}

// ─── Category prep time baselines (minutes) ───────────────────────────────────

export const CATEGORY_PREP: Record<Category, { min: number; max: number }> = {
  'Pampagana':     { min: 5,  max: 10 },
  'Sabaw':         { min: 12, max: 20 },
  'Ulam':          { min: 15, max: 25 },
  'Kanin & Pansit':{ min: 8,  max: 12 },
  'Merienda':      { min: 3,  max: 7  },
  'Inumin':        { min: 1,  max: 3  },
};

function maxPrepForItems(items: TicketItem[]): number {
  return Math.max(...items.map(i => CATEGORY_PREP[i.category]?.max ?? 15));
}

// ─── Module-level state ───────────────────────────────────────────────────────

let tickets: KitchenTicket[] = [];
let stock: StockEntry[] = menuItems.map(m => ({
  menuItemId: m.id,
  name: m.name,
  category: m.category,
  available: m.available,
}));
let listeners: (() => void)[] = [];

// Simulated hourly order counts (last 12 hours, rolling)
export let hourlyCounts: number[] = [2, 4, 7, 12, 18, 22, 15, 9, 14, 20, 17, 11];

function notify() { listeners.forEach(fn => fn()); }

// ─── Ticket actions ───────────────────────────────────────────────────────────

export function getTickets() { return tickets; }
export function getStock() { return stock; }

export function addTicket(t: Omit<KitchenTicket, 'expectedPrepMinutes' | 'statusHistory'>) {
  const ticket: KitchenTicket = {
    ...t,
    statusHistory: [{ status: t.status, at: t.receivedAt }],
    expectedPrepMinutes: maxPrepForItems(t.items),
  };
  tickets = [ticket, ...tickets].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  hourlyCounts = [...hourlyCounts.slice(1), hourlyCounts[hourlyCounts.length - 1] + 1];
  notify();
}

export function advanceTicket(ticketId: string) {
  tickets = tickets.map(t => {
    if (t.id !== ticketId) return t;
    const next: TicketStatus = t.status === 'preparing' ? 'ready' : 'served';
    return {
      ...t,
      status: next,
      statusHistory: [...t.statusHistory, { status: next, at: new Date() }],
    };
  });
  notify();
}

// ─── Stock actions ────────────────────────────────────────────────────────────

export function setAvailable(menuItemId: string, available: boolean) {
  stock = stock.map(s =>
    s.menuItemId === menuItemId
      ? { ...s, available, markedUnavailableAt: !available ? new Date() : undefined }
      : s
  );
  notify();
}

export function isAvailable(menuItemId: string): boolean {
  return stock.find(s => s.menuItemId === menuItemId)?.available ?? true;
}

// ─── Seed some demo tickets ───────────────────────────────────────────────────

function seedTickets() {
  const now = Date.now();
  const demo: Omit<KitchenTicket, 'expectedPrepMinutes' | 'statusHistory'>[] = [
    {
      id: 'TKT-001',
      orderId: 'ORD-A1B2C3',
      tableLabel: 'Table 2',
      source: 'qr',
      status: 'preparing',
      receivedAt: new Date(now - 18 * 60 * 1000),
      items: [
        { menuItemId: 'm4', name: 'Bulalo Batangas', quantity: 1, category: 'Sabaw' },
        { menuItemId: 'm7', name: 'Adobong Puti', quantity: 2, category: 'Ulam' },
        { menuItemId: 'm11', name: 'Sinangag at Itlog', quantity: 2, category: 'Kanin & Pansit' },
      ],
    },
    {
      id: 'TKT-002',
      orderId: 'ORD-D4E5F6',
      tableLabel: 'Counter #1',
      source: 'pos',
      status: 'ready',
      receivedAt: new Date(now - 12 * 60 * 1000),
      items: [
        { menuItemId: 'm1', name: 'Bagnet Chicharon', quantity: 1, category: 'Pampagana' },
        { menuItemId: 'm12', name: 'Pansit Bihon Guisado', quantity: 1, category: 'Kanin & Pansit' },
        { menuItemId: 'm17', name: 'Salabat', quantity: 2, category: 'Inumin' },
      ],
    },
    {
      id: 'TKT-003',
      orderId: 'ORD-G7H8I9',
      tableLabel: 'Table 5',
      source: 'qr',
      status: 'preparing',
      receivedAt: new Date(now - 6 * 60 * 1000),
      items: [
        { menuItemId: 'm5', name: 'Sinigang na Bangus', quantity: 1, category: 'Sabaw' },
        { menuItemId: 'm10', name: 'Pinakbet Ilocos', quantity: 1, category: 'Ulam' },
        { menuItemId: 'm14', name: 'Halo-Halo', quantity: 2, category: 'Merienda' },
        { menuItemId: 'm18', name: 'Buko Juice', quantity: 2, category: 'Inumin' },
      ],
    },
    {
      id: 'TKT-004',
      orderId: 'ORD-J1K2L3',
      tableLabel: 'Counter #2',
      source: 'pos',
      status: 'preparing',
      receivedAt: new Date(now - 2 * 60 * 1000),
      items: [
        { menuItemId: 'm8', name: 'Kare-Kare', quantity: 1, category: 'Ulam' },
        { menuItemId: 'm2', name: 'Empanada Vigan', quantity: 2, category: 'Pampagana' },
        { menuItemId: 'm19', name: "Sago't Gulaman", quantity: 2, category: 'Inumin' },
      ],
    },
  ];

  demo.forEach(d => {
    const ticket: KitchenTicket = {
      ...d,
      statusHistory: [{ status: d.status, at: d.receivedAt }],
      expectedPrepMinutes: maxPrepForItems(d.items),
    };
    tickets.push(ticket);
  });
  tickets.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
}

seedTickets();

// ─── Simulate incoming POS order every ~45s ───────────────────────────────────

const POS_ITEMS: TicketItem[][] = [
  [
    { menuItemId: 'm6', name: 'Tinola na Manok', quantity: 1, category: 'Sabaw' },
    { menuItemId: 'm13', name: 'Arroz Caldo', quantity: 2, category: 'Kanin & Pansit' },
  ],
  [
    { menuItemId: 'm15', name: 'Bibingka', quantity: 2, category: 'Merienda' },
    { menuItemId: 'm18', name: 'Buko Juice', quantity: 2, category: 'Inumin' },
  ],
];
let posIdx = 0;

setInterval(() => {
  const items = POS_ITEMS[posIdx % POS_ITEMS.length];
  posIdx++;
  const counter = posIdx % 2 === 0 ? 'Counter #1' : 'Counter #2';
  addTicket({
    id: `TKT-POS-${Date.now()}`,
    orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    tableLabel: counter,
    source: 'pos',
    status: 'preparing',
    receivedAt: new Date(),
    items,
  });
}, 45000);

