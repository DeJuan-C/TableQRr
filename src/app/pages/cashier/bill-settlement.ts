import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CASHIER_NAV, StaffLayout } from '../../layouts/staff-layout';
import { NumPipe } from '../../shared/num.pipe';
import { QrCode } from '../../shared/qr-code';
import type { Category } from '../../data/menu';
import { getBills, getCashDrawer, settleBill, type PaymentMethod } from '../../stores/cashierStore';
import { addTicket } from '../../stores/kitchenStore';
import { deductStockForBill } from '../../stores/inventoryStore';

@Component({
  selector: 'app-bill-settlement',
  imports: [StaffLayout, FormsModule, NumPipe, QrCode],
  templateUrl: './bill-settlement.html',
})
export class BillSettlement {
  private router = inject(Router);
  nav = CASHIER_NAV;

  /** `?highlight=BILL-ID` query param, bound via withComponentInputBinding. */
  highlight = input<string>();

  methods: [PaymentMethod, string][] = [['cash', '💵 Cash'], ['gcash', '💙 GCash'], ['maya', '💚 Maya']];

  selectedId: string | null = this.openBills[0]?.id ?? null;
  tendered: string | number = '';
  method: PaymentMethod = 'cash';
  settled: { change: number; txnId: string } | null = null;
  showQrModal = false;

  constructor() {
    effect(() => {
      const h = this.highlight();
      if (h) this.select(h);
    });
  }

  get openBills() { return getBills().filter(b => b.status === 'open'); }
  get cashDrawer() { return getCashDrawer(); }
  get selected() { return this.openBills.find(b => b.id === this.selectedId) ?? null; }

  /** Selecting a bill resets the payment form (mirrors the React effect on selectedId). */
  select(id: string | null) {
    if (id === this.selectedId) return;
    this.selectedId = id;
    this.tendered = '';
    this.settled = null;
    this.method = 'cash';
  }

  formatTime(d: Date) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  age(d: Date) { return Math.floor((Date.now() - d.getTime()) / 60000); }

  get tenderedNum() { return parseFloat(String(this.tendered)) || 0; }
  get isDigital() { return this.method === 'gcash' || this.method === 'maya'; }
  get methodName() { return this.method === 'gcash' ? 'GCash' : 'Maya'; }
  get effectiveTendered() { return this.isDigital ? (this.selected?.total ?? 0) : this.tenderedNum; }
  get change() { return this.selected ? Math.max(0, this.effectiveTendered - this.selected.total) : 0; }
  get canSettle() { return !!this.selected && (this.isDigital || this.tenderedNum >= this.selected.total); }

  get quickAmounts() {
    const s = this.selected;
    return s ? [
      s.total,
      Math.ceil(s.total / 100) * 100,
      Math.ceil(s.total / 500) * 500,
      Math.ceil(s.total / 1000) * 1000,
    ].filter((v, i, a) => a.indexOf(v) === i) : [];
  }

  get qrValue() {
    const s = this.selected!;
    return `${this.method === 'gcash' ? 'gcash' : 'maya'}://pay?amount=${s.total.toFixed(2)}&ref=${s.id}&merchant=KainanKayAlingNene`;
  }

  openDiscount() {
    this.router.navigate(['/cashier/discount'], { queryParams: { bill: this.selected!.id } });
  }

  primaryAction() {
    if (this.isDigital) this.showQrModal = true;
    else this.handleSettle();
  }

  confirmDigital() {
    this.handleSettle();
    this.showQrModal = false;
  }

  handleSettle() {
    const selected = this.selected;
    if (!selected || !this.canSettle) return;
    const tx = settleBill(selected.id, this.effectiveTendered, this.method);
    if (tx) {
      // Dispatch to kitchen only after payment is confirmed
      if (selected.source === 'pos') {
        addTicket({
          id: `TKT-${selected.id}`,
          orderId: selected.id,
          tableLabel: selected.tableLabel ?? selected.orderType,
          source: 'pos',
          status: 'preparing',
          receivedAt: new Date(),
          items: selected.items.map(i => ({
            menuItemId: i.menuItemId,
            name: i.name,
            quantity: i.quantity,
            category: i.category as Category,
          })),
        });
      }
      deductStockForBill(selected.id, selected.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })));
      this.settled = { change: tx.change, txnId: tx.id };
      setTimeout(() => {
        this.settled = null;
        const remaining = getBills().filter(b => b.status === 'open' && b.id !== selected.id);
        this.select(remaining[0]?.id ?? null);
        this.router.navigate(['/cashier/bills']);
      }, 2500);
    }
  }
}
