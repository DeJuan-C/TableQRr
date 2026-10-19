import { Component, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CASHIER_NAV, StaffLayout } from '../../layouts/staff-layout';
import { NumPipe } from '../../shared/num.pipe';
import { getCashDrawer, getDailySummary } from '../../stores/cashierStore';

type ClosingState = 'idle' | 'counting' | 'report';

@Component({
  selector: 'app-day-closing',
  imports: [StaffLayout, FormsModule, NumPipe],
  templateUrl: './day-closing.html',
})
export class DayClosing {
  nav = CASHIER_NAV;
  private reportArea = viewChild<ElementRef<HTMLDivElement>>('reportArea');

  state: ClosingState = 'idle';
  actualCash: string | number = '';
  closedAt = new Date();
  today = new Date();

  get cashDrawer() { return getCashDrawer(); }
  get summary() { return getDailySummary(); }

  get actualNum() { return parseFloat(String(this.actualCash)) || 0; }
  get discrepancy() { return this.actualNum - this.summary.expectedDrawer; }
  get hasDiscrepancy() { return Math.abs(this.discrepancy) > 0.5; }

  /** Colour for the short / over / balanced state (strong variant used for the amount). */
  get statusColor() { return this.hasDiscrepancy ? (this.discrepancy < 0 ? '#C0392B' : '#8B6914') : '#4A7C59'; }
  get amountColor() { return this.hasDiscrepancy ? (this.discrepancy < 0 ? '#C0392B' : '#D4A843') : '#4A7C59'; }
  get boxBg() { return this.hasDiscrepancy ? (this.discrepancy < 0 ? '#C0392B10' : '#D4A84310') : '#4A7C5910'; }
  get boxBorder() { return this.hasDiscrepancy ? (this.discrepancy < 0 ? '#C0392B50' : '#D4A84350') : '#4A7C5950'; }

  get stats() {
    const s = this.summary;
    return [
      { label: 'Total Sales', value: `₱${s.totalSales.toLocaleString()}`, color: '#7A3B1E' },
      { label: 'Cash Sales', value: `₱${s.totalCash.toLocaleString()}`, color: '#5C2E0A' },
      { label: 'E-Wallet Sales', value: `₱${s.totalEwallet.toLocaleString()}`, color: '#4A7C59' },
      { label: 'Discounts Given', value: `₱${s.totalDiscounts.toLocaleString()}`, color: '#D4A843' },
    ];
  }

  get reportRows(): [string, string | number][] {
    const s = this.summary;
    return [
      ['Total Transactions', s.todayTxns.length],
      ['Gross Sales', `₱${s.totalSales.toLocaleString()}`],
      ['Discounts Given', `₱${s.totalDiscounts.toLocaleString()}`],
      ['Net Sales', `₱${s.totalSales.toLocaleString()}`],
    ];
  }

  formatTime(d: Date) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  formatDate(d: Date) {
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  handlePrintReport() {
    const el = this.reportArea()?.nativeElement;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Day Close Report</title>
      <style>body{font-family:monospace;font-size:12px;width:360px;margin:0 auto;padding:16px;color:#2C1810;}</style>
      </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }
}
