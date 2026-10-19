import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerLayout } from '../../layouts/customer-layout';
import { NumPipe } from '../../shared/num.pipe';
import { QrCode } from '../../shared/qr-code';
import { customerReceiptHtml, downloadFile } from '../../shared/download';
import { getOrder } from '../../stores/orderStore';

type Method = 'gcash' | 'maya' | 'cash' | null;
type PayState = 'select' | 'qr' | 'upload' | 'confirming' | 'done' | 'cash-pending';

@Component({
  selector: 'app-payment',
  imports: [CustomerLayout, NumPipe, QrCode],
  templateUrl: './payment.html',
})
export class Payment {
  private router = inject(Router);
  tableId = input<string>();

  method: Method = null;
  payState: PayState = 'select';
  proofFile: string | null = null;
  refNumber = `BK-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  ewallets = [
    { key: 'gcash' as Method, label: 'GCash', color: '#0066CC', emoji: '💙', sub: 'Send via GCash QR' },
    { key: 'maya' as Method, label: 'Maya', color: '#1BAC4B', emoji: '💚', sub: 'Send via Maya QR' },
  ];

  get order() { return getOrder(); }
  get total() { return this.order?.total ?? 0; }
  get methodName() { return this.method === 'gcash' ? 'GCash' : 'Maya'; }
  get qrValue() {
    return `${this.method === 'gcash' ? 'gcash' : 'paymaya'}://pay?amount=${this.total}&ref=${this.refNumber}&merchant=BahayKuboRestaurant`;
  }

  goToMenu() { this.router.navigate([`/table/${this.tableId()}/menu`]); }
  goToOrder() { this.router.navigate([`/table/${this.tableId()}/order`]); }

  handleMethodSelect(m: Method) {
    this.method = m;
    if (m === 'cash') { this.payState = 'cash-pending'; return; }
    this.payState = 'qr';
  }

  handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.proofFile = URL.createObjectURL(file);
    this.payState = 'upload';
  }

  handleConfirm() {
    this.payState = 'confirming';
    setTimeout(() => (this.payState = 'done'), 2000);
  }

  handleDownloadReceipt() {
    const order = this.order;
    const html = customerReceiptHtml({
      title: this.refNumber,
      meta: [
        ['Order', order?.id ?? ''],
        ['Table', this.tableId() ?? ''],
        ['Ref', this.refNumber],
        ['Method', this.method === 'gcash' ? 'GCash' : this.method === 'maya' ? 'Maya' : 'Cash'],
      ],
      rows: (order?.items ?? []).map(i => ({ name: i.item.name, quantity: i.quantity, amount: i.item.price * i.quantity })),
      total: this.total,
    });
    downloadFile(html, `receipt-${this.refNumber}.html`);
  }
}
