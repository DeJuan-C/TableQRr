import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { Login } from './pages/login';
// Admin
import { AdminHome } from './pages/admin/admin-home';
import { AdminQR } from './pages/admin/admin-qr';
import { KDS } from './pages/admin/kds';
import { StockControl } from './pages/admin/stock-control';
import { Workload } from './pages/admin/workload';
import { MenuManager } from './pages/admin/menu-manager';
import { FloorMap } from './pages/admin/floor-map';
import { UserManagement } from './pages/admin/user-management';
import { AuditLog } from './pages/admin/audit-log';
import { Analytics } from './pages/admin/analytics';
import { FireTimeAdvisor } from './pages/admin/fire-time-advisor';
import { SubstitutionSuggestion } from './pages/admin/substitution-suggestion';
// Cashier
import { POSTerminal } from './pages/cashier/pos-terminal';
import { BillSettlement } from './pages/cashier/bill-settlement';
import { DiscountManager } from './pages/cashier/discount-manager';
import { Receipts } from './pages/cashier/receipts';
import { DayClosing } from './pages/cashier/day-closing';
// Inventory
import { IngredientMaster } from './pages/inventory/ingredient-master';
import { RecipeMapping } from './pages/inventory/recipe-mapping';
import { StockMonitor } from './pages/inventory/stock-monitor';
import { VarianceEngine } from './pages/inventory/variance-engine';
import { PurchaseOrders } from './pages/inventory/purchase-orders';
// Customer
import { Menu } from './pages/customer/menu';
import { Cart } from './pages/customer/cart';
import { OrderStatus } from './pages/customer/order-status';
import { Payment } from './pages/customer/payment';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  // Admin
  { path: 'admin/home', component: AdminHome },
  { path: 'admin/qr', component: AdminQR },
  { path: 'admin/kds', component: KDS },
  { path: 'admin/stock', component: StockControl },
  { path: 'admin/workload', component: Workload },
  // Cashier
  { path: 'cashier/pos', component: POSTerminal },
  { path: 'cashier/bills', component: BillSettlement },
  { path: 'cashier/discount', component: DiscountManager },
  { path: 'cashier/receipts', component: Receipts },
  { path: 'cashier/closing', component: DayClosing },
  // Extended Admin
  { path: 'admin/menu', component: MenuManager },
  { path: 'admin/floor', component: FloorMap },
  { path: 'admin/users', component: UserManagement },
  { path: 'admin/audit', component: AuditLog },
  { path: 'admin/analytics', component: Analytics },
  { path: 'admin/fire-time', component: FireTimeAdvisor },
  { path: 'admin/substitution', component: SubstitutionSuggestion },
  // Inventory
  { path: 'inventory/ingredients', component: IngredientMaster },
  { path: 'inventory/recipes', component: RecipeMapping },
  { path: 'inventory/stock', component: StockMonitor },
  { path: 'inventory/variance', component: VarianceEngine },
  { path: 'inventory/purchase-orders', component: PurchaseOrders },
  // Customer
  { path: 'table/:tableId/menu', component: Menu },
  { path: 'table/:tableId/cart', component: Cart },
  { path: 'table/:tableId/order', component: OrderStatus },
  { path: 'table/:tableId/payment', component: Payment },
  { path: '**', redirectTo: '' },
];
