import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

export interface NavItem { path: string; label: string; icon: string; }

/** Shared shell for the Cashier and Inventory sections (CashierLayout / InventoryLayout in the React source). */
@Component({
  selector: 'app-staff-layout',
  imports: [RouterLink],
  templateUrl: './staff-layout.html',
})
export class StaffLayout {
  router = inject(Router);
  subtitle = input.required<string>();
  nav = input.required<NavItem[]>();
  navClass = input('w-44');
  mainClass = input('p-6');

  isActive(path: string) { return this.router.url.startsWith(path); }
}

export const CASHIER_NAV: NavItem[] = [
  { path: '/cashier/pos',      label: 'POS Terminal', icon: '🖥' },
  { path: '/cashier/bills',    label: 'Bills & Drawer', icon: '💵' },
  { path: '/cashier/discount', label: 'Discounts', icon: '🏷' },
  { path: '/cashier/receipts', label: 'Receipts', icon: '🧾' },
  { path: '/cashier/closing',  label: 'Day Close', icon: '🔒' },
];

export const INVENTORY_NAV: NavItem[] = [
  { path: '/inventory/ingredients',  label: 'Ingredient Master', icon: '🧂' },
  { path: '/inventory/recipes',      label: 'Recipe Mapping',    icon: '📖' },
  { path: '/inventory/stock',        label: 'Stock Monitor',     icon: '📊' },
  { path: '/inventory/variance',     label: 'Variance Engine',   icon: '⚖️' },
  { path: '/inventory/purchase-orders', label: 'Purchase Orders', icon: '📦' },
];
