import { Component, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CASHIER_NAV, StaffLayout } from '../../layouts/staff-layout';
import { NumPipe } from '../../shared/num.pipe';
import {
  DISCOUNT_CATALOG, applyDiscount, getBills, getTransactions, removeDiscount,
  type Bill, type DiscountRecord, type DiscountType,
} from '../../stores/cashierStore';
import { CardScanner, type ScannedData } from './card-scanner';

@Component({
  selector: 'app-discount-manager',
  imports: [StaffLayout, FormsModule, NumPipe, CardScanner],
  templateUrl: './discount-manager.html',
})
export class DiscountManager {
  nav = CASHIER_NAV;
  catalog = DISCOUNT_CATALOG;

  /** `?bill=BILL-ID` query param, bound via withComponentInputBinding. */
  bill = input<string>();

  selectedBillId: string | null = this.openBills[0]?.id ?? null;
  discountType: DiscountType = 'none';
  scannedData: ScannedData | null = null;
  applied = false;

  constructor() {
    effect(() => {
      const b = this.bill();
      if (b) this.selectBill(b);
    });
  }

  get openBills() { return getBills().filter(b => b.status === 'open'); }
  get selectedBill(): Bill | null { return this.openBills.find(b => b.id === this.selectedBillId) ?? null; }
  get catalogEntry() { return DISCOUNT_CATALOG.find(d => d.type === this.discountType); }
  get auditTrail() { return getTransactions().filter(t => t.discount && t.discount.type !== 'none').slice(0, 20); }

  /** Changing the bill resets the discount form (mirrors the React effect on selectedBillId). */
  selectBill(id: string | null) {
    if (id === this.selectedBillId) return;
    this.selectedBillId = id;
    this.discountType = 'none';
    this.scannedData = null;
    this.applied = false;
  }

  /** Changing the discount type resets the scan (mirrors the React effect on discountType). */
  selectType(type: DiscountType) {
    if (type === this.discountType) return;
    this.discountType = type;
    this.scannedData = null;
    this.applied = false;
  }

  get showScanner() {
    return !!this.catalogEntry?.needsId && (this.discountType === 'senior' || this.discountType === 'pwd') && !this.scannedData;
  }

  formatTime(d: Date) {
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  formatDate(d: Date) {
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  previewTotal(bill: Bill) {
    const entry = this.catalogEntry;
    if (!entry || this.discountType === 'none') return bill.total;
    const discountAmount = Math.round((bill.subtotal * entry.percent) / 100);
    const taxBase = bill.subtotal - discountAmount;
    return taxBase + Math.round(taxBase * 0.05);
  }

  previewDiscountAmount(bill: Bill) {
    return bill.discountAmount || Math.round((bill.subtotal * (this.catalogEntry?.percent ?? 0)) / 100);
  }

  displayTotal(bill: Bill) {
    return this.discountType !== 'none' && !bill.discount ? this.previewTotal(bill) : bill.total;
  }

  handleApply() {
    const bill = this.selectedBill;
    const entry = this.catalogEntry;
    if (!bill || !entry || this.discountType === 'none') return;
    if (entry.needsId && !this.scannedData) return;

    const record: DiscountRecord = {
      type: this.discountType,
      label: entry.label,
      idNumber: this.scannedData?.idNumber,
      customerName: this.scannedData?.name,
      cardData: this.scannedData?.extra,
      percent: entry.percent,
      appliedAt: new Date(),
      appliedBy: 'Cashier 1',
    };
    applyDiscount(bill.id, record);
    this.applied = true;
  }

  handleRemove() {
    if (!this.selectedBill) return;
    removeDiscount(this.selectedBill.id);
    this.discountType = 'none';
    this.scannedData = null;
    this.applied = false;
  }
}
