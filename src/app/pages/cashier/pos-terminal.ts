import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CASHIER_NAV, StaffLayout } from '../../layouts/staff-layout';
import { NumPipe } from '../../shared/num.pipe';
import { categories, menuItems, type Category, type MenuItem } from '../../data/menu';
import { createBill, type BillItem, type OrderType } from '../../stores/cashierStore';

const CATEGORY_EMOJI: Record<Category, string> = {
  'Sabaw': '🍲', 'Ulam': '🍖', 'Kanin & Pansit': '🍚',
  'Pampagana': '🥗', 'Merienda': '🍮', 'Inumin': '🥤',
};

interface CartLine { item: MenuItem; qty: number }

// ─── Auto-generate order ID numbers ──────────────────────────────────────────

let _diCounter = Math.floor(Math.random() * 40) + 1;
let _tkCounter = Math.floor(Math.random() * 20) + 1;

function nextDineInId() { return `DI-${String(++_diCounter).padStart(4, '0')}`; }
function nextTakeOutId() { return `TK-${String(++_tkCounter).padStart(4, '0')}`; }

// ─── Main POS Terminal ────────────────────────────────────────────────────────

@Component({
  selector: 'app-pos-terminal',
  imports: [StaffLayout, FormsModule, NumPipe],
  templateUrl: './pos-terminal.html',
})
export class POSTerminal {
  private router = inject(Router);
  nav = CASHIER_NAV;
  categories = categories;
  emoji = CATEGORY_EMOJI;

  orderTypeOptions = [
    { type: 'dine-in' as OrderType, icon: '🍽', label: 'Dine-In', sub: 'Seated at a table', genId: nextDineInId, prefix: 'DI' },
    { type: 'take-out' as OrderType, icon: '🥡', label: 'Take-Out', sub: 'Bring food home', genId: nextTakeOutId, prefix: 'TK' },
  ];

  orderType: OrderType | null = null;
  tableLabel = '';
  activeCategory: Category = 'Ulam';
  cart: CartLine[] = [];
  search = '';

  handleOrderTypeSelect(type: OrderType, label: string) {
    this.orderType = type;
    this.tableLabel = label;
  }

  resetOrderType() {
    this.orderType = null;
    this.cart = [];
  }

  selectCategory(cat: Category) {
    this.activeCategory = cat;
    this.search = '';
  }

  get filteredItems() {
    return menuItems.filter(m => {
      const matchCat = m.category === this.activeCategory;
      const matchSearch = !this.search || m.name.toLowerCase().includes(this.search.toLowerCase());
      return matchCat && matchSearch && m.available;
    });
  }

  inCart(id: string) { return this.cart.find(c => c.item.id === id); }

  addItem(item: MenuItem) {
    const ex = this.inCart(item.id);
    this.cart = ex
      ? this.cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      : [...this.cart, { item, qty: 1 }];
  }

  setQty(id: string, qty: number) {
    if (qty <= 0) this.cart = this.cart.filter(c => c.item.id !== id);
    else this.cart = this.cart.map(c => c.item.id === id ? { ...c, qty } : c);
  }

  get subtotal() { return this.cart.reduce((s, c) => s + c.item.price * c.qty, 0); }
  get serviceCharge() { return Math.round(this.subtotal * 0.05); }
  get total() { return this.subtotal + this.serviceCharge; }

  handleConfirm() {
    if (!this.cart.length || !this.orderType) return;
    const items: BillItem[] = this.cart.map(c => ({
      menuItemId: c.item.id,
      name: c.item.name,
      category: c.item.category,
      price: c.item.price,
      quantity: c.qty,
    }));
    // Create the bill — kitchen dispatch happens in BillSettlement after payment
    const bill = createBill(items, this.orderType, this.tableLabel, 'pos');
    this.router.navigate(['/cashier/bills'], { queryParams: { highlight: bill.id } });
  }
}
