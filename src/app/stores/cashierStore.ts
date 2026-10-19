
// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderType = 'dine-in' | 'take-out';
export type BillStatus = 'open' | 'settled' | 'voided';
export type DiscountType = 'none' | 'senior' | 'pwd' | 'employee' | 'promo';
export type PaymentMethod = 'cash' | 'gcash' | 'maya';

export interface BillItem {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export interface DiscountRecord {
  type: DiscountType;
  label: string;
  idNumber?: string;
  customerName?: string;
  cardData?: string;      // extra card fields (age, disability type, etc.)
  percent: number;        // e.g. 20 for 20%
  appliedAt: Date;
  appliedBy: string;
}

export interface Transaction {
  id: string;
  billId: string;
  orderType: OrderType;
  tableLabel?: string;
  items: BillItem[];
  subtotal: number;
  serviceCharge: number;
  discount?: DiscountRecord;
  discountAmount: number;
  total: number;
  amountTendered: number;
  change: number;
  paymentMethod: PaymentMethod;
  settledAt: Date;
  cashier: string;
}

export interface Bill {
  id: string;
  orderType: OrderType;
  tableLabel?: string;
  source: 'pos' | 'qr' | 'cash-request';
  items: BillItem[];
  subtotal: number;
  serviceCharge: number;
  discount?: DiscountRecord;
  discountAmount: number;
  total: number;
  status: BillStatus;
  createdAt: Date;
  note?: string;
}

export interface CashDrawer {
  balance: number;
  openingBalance: number;
  transactions: { amount: number; type: 'in' | 'out'; note: string; at: Date }[];
}

// ─── Discount catalog ─────────────────────────────────────────────────────────

export const DISCOUNT_CATALOG: { type: DiscountType; label: string; percent: number; needsId: boolean }[] = [
  { type: 'senior', label: 'Senior Citizen (SC)', percent: 20, needsId: true },
  { type: 'pwd',    label: 'PWD Discount',         percent: 20, needsId: true },
];

// ─── Module-level state ───────────────────────────────────────────────────────

let bills: Bill[] = [];
let transactions: Transaction[] = [];
let cashDrawer: CashDrawer = { balance: 5000, openingBalance: 5000, transactions: [] };
let listeners: (() => void)[] = [];

// Seed a couple of demo open bills (cash-request from customer flow)
const now = Date.now();
bills = [
  {
    id: 'BILL-001',
    orderType: 'dine-in',
    tableLabel: 'Table 3',
    source: 'cash-request',
    items: [
      { menuItemId: 'm7', name: 'Adobong Puti', category: 'Ulam', price: 295, quantity: 2 },
      { menuItemId: 'm4', name: 'Bulalo Batangas', category: 'Sabaw', price: 345, quantity: 1 },
      { menuItemId: 'm18', name: 'Buko Juice', category: 'Inumin', price: 75, quantity: 2 },
    ],
    subtotal: 1085,
    serviceCharge: 54,
    discountAmount: 0,
    total: 1139,
    status: 'open',
    createdAt: new Date(now - 22 * 60000),
    note: 'Customer requested cash payment via mobile',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTotals(items: BillItem[], discount?: DiscountRecord) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discount ? Math.round((subtotal * discount.percent) / 100) : 0;
  const taxBase = subtotal - discountAmount;
  const serviceCharge = Math.round(taxBase * 0.05);
  const total = taxBase + serviceCharge;
  return { subtotal, discountAmount, serviceCharge, total };
}

function notify() { listeners.forEach(f => f()); }

// ─── Actions ──────────────────────────────────────────────────────────────────

export function getBills() { return bills; }
export function getTransactions() { return transactions; }
export function getCashDrawer() { return cashDrawer; }

export function createBill(
  items: BillItem[],
  orderType: OrderType,
  tableLabel?: string,
  source: Bill['source'] = 'pos',
): Bill {
  const { subtotal, serviceCharge, total } = computeTotals(items);
  const bill: Bill = {
    id: `BILL-${Date.now().toString(36).toUpperCase().slice(-5)}`,
    orderType, tableLabel, source, items,
    subtotal, serviceCharge, discountAmount: 0, total,
    status: 'open', createdAt: new Date(),
  };
  bills = [bill, ...bills];
  notify();
  return bill;
}

export function applyDiscount(billId: string, discount: DiscountRecord) {
  bills = bills.map(b => {
    if (b.id !== billId || b.status !== 'open') return b;
    const { subtotal, discountAmount, serviceCharge, total } = computeTotals(b.items, discount);
    return { ...b, discount, discountAmount, subtotal, serviceCharge, total };
  });
  notify();
}

export function removeDiscount(billId: string) {
  bills = bills.map(b => {
    if (b.id !== billId || b.status !== 'open') return b;
    const { subtotal, serviceCharge, total } = computeTotals(b.items);
    return { ...b, discount: undefined, discountAmount: 0, subtotal, serviceCharge, total };
  });
  notify();
}

export function settleBill(
  billId: string,
  amountTendered: number,
  paymentMethod: PaymentMethod,
  cashier = 'Cashier 1',
): Transaction | null {
  const bill = bills.find(b => b.id === billId && b.status === 'open');
  if (!bill) return null;

  const change = Math.max(0, amountTendered - bill.total);
  const tx: Transaction = {
    id: `TXN-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    billId: bill.id,
    orderType: bill.orderType,
    tableLabel: bill.tableLabel,
    items: bill.items,
    subtotal: bill.subtotal,
    serviceCharge: bill.serviceCharge,
    discount: bill.discount,
    discountAmount: bill.discountAmount,
    total: bill.total,
    amountTendered,
    change,
    paymentMethod,
    settledAt: new Date(),
    cashier,
  };

  transactions = [tx, ...transactions];
  bills = bills.map(b => b.id === billId ? { ...b, status: 'settled' } : b);

  if (paymentMethod === 'cash') {
    cashDrawer = {
      ...cashDrawer,
      balance: cashDrawer.balance + amountTendered - change,
      transactions: [...cashDrawer.transactions, {
        amount: amountTendered - change,
        type: 'in',
        note: `Bill ${billId} — ${bill.tableLabel ?? bill.orderType}`,
        at: new Date(),
      }],
    };
  }

  notify();
  return tx;
}

export function getDailySummary() {
  const today = new Date();
  const todayTxns = transactions.filter(t =>
    t.settledAt.toDateString() === today.toDateString()
  );
  const totalSales = todayTxns.reduce((s, t) => s + t.total, 0);
  const totalCash  = todayTxns.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.total, 0);
  const totalEwallet = todayTxns.filter(t => t.paymentMethod !== 'cash').reduce((s, t) => s + t.total, 0);
  const totalDiscounts = todayTxns.reduce((s, t) => s + t.discountAmount, 0);
  const expectedDrawer = cashDrawer.openingBalance + totalCash;
  return { todayTxns, totalSales, totalCash, totalEwallet, totalDiscounts, expectedDrawer };
}

