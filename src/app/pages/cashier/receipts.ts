import { Component, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CASHIER_NAV, StaffLayout } from '../../layouts/staff-layout';
import { NumPipe } from '../../shared/num.pipe';
import { getTransactions } from '../../stores/cashierStore';

function toDateKey(d: Date) {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

@Component({
  selector: 'app-receipts',
  imports: [StaffLayout, FormsModule, NumPipe],
  templateUrl: './receipts.html',
})
export class Receipts {
  nav = CASHIER_NAV;
  weekdays = WEEKDAYS;
  private printArea = viewChild<ElementRef<HTMLDivElement>>('printArea');

  selectedId: string | null = getTransactions()[0]?.id ?? null;
  filterDate = '';
  search = '';

  // ─── Mini calendar state ───
  private today = new Date();
  viewYear = this.today.getFullYear();
  viewMonth = this.today.getMonth(); // 0-indexed

  get transactions() { return getTransactions(); }

  formatTime(d: Date) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  formatDate(d: Date) {
    return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  get activeDates() { return new Set(this.transactions.map(t => toDateKey(t.settledAt))); }

  get filtered() {
    let list = this.transactions;
    if (this.filterDate) list = list.filter(t => toDateKey(t.settledAt) === this.filterDate);
    if (this.search.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        (t.tableLabel ?? '').toLowerCase().includes(q) ||
        t.orderType.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q) ||
        t.cashier.toLowerCase().includes(q) ||
        t.items.some(i => i.name.toLowerCase().includes(q)) ||
        (t.discount?.customerName ?? '').toLowerCase().includes(q) ||
        (t.discount?.idNumber ?? '').toLowerCase().includes(q) ||
        String(t.total).includes(q)
      );
    }
    return list;
  }

  get selected() {
    return this.filtered.find(t => t.id === this.selectedId)
      ?? this.transactions.find(t => t.id === this.selectedId)
      ?? null;
  }

  get hasFilters() { return !!(this.filterDate || this.search.trim()); }

  onSearch(value: string) {
    this.search = value;
    this.selectedId = null;
  }

  selectDate(key: string) {
    this.filterDate = key;
    this.selectedId = null;
  }

  // ─── Mini calendar ───
  get cells() {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const result: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }

  get monthLabel() {
    return new Date(this.viewYear, this.viewMonth, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
  }
  nextMonth() {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
  }

  dayKey(day: number) {
    return `${this.viewYear}-${String(this.viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  isToday(key: string) { return key === toDateKey(this.today); }

  // ─── Receipt helpers ───
  round(n: number) { return Math.round(n); }
  paymentLabel(m: string) { return m === 'cash' ? 'Cash Tendered' : m === 'gcash' ? 'GCash' : 'Maya'; }

  handlePrint() {
    const el = this.printArea()?.nativeElement;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Receipt — ${this.selected?.id}</title>
      <style>
        body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 16px; color: #2C1810; }
        * { box-sizing: border-box; }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  }
}
