import type { MenuItem } from '../data/menu';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served';
  submittedAt: Date;
  total: number;
}

let cartItems: CartItem[] = [];
let currentOrder: Order | null = null;
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function getCart() { return cartItems; }
export function getOrder() { return currentOrder; }

export function addToCart(item: MenuItem) {
  const existing = cartItems.find(c => c.item.id === item.id);
  if (existing) {
    cartItems = cartItems.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
  } else {
    cartItems = [...cartItems, { item, quantity: 1 }];
  }
  notify();
}

export function removeFromCart(itemId: string) {
  cartItems = cartItems.filter(c => c.item.id !== itemId);
  notify();
}

export function updateQty(itemId: string, qty: number) {
  if (qty <= 0) { removeFromCart(itemId); return; }
  cartItems = cartItems.map(c => c.item.id === itemId ? { ...c, quantity: qty } : c);
  notify();
}

export function clearCart() {
  cartItems = [];
  notify();
}

export function submitOrder(tableId: string): Order {
  const total = cartItems.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  currentOrder = {
    id: `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    tableId,
    items: [...cartItems],
    status: 'preparing',
    submittedAt: new Date(),
    total,
  };
  clearCart();
  setTimeout(() => {
    if (currentOrder) { currentOrder = { ...currentOrder, status: 'ready' }; notify(); }
  }, 10000);
  setTimeout(() => {
    if (currentOrder) { currentOrder = { ...currentOrder, status: 'served' }; notify(); }
  }, 20000);
  notify();
  return currentOrder;
}

