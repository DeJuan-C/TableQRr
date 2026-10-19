import { Component, OnDestroy, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerLayout } from '../../layouts/customer-layout';
import { NumPipe } from '../../shared/num.pipe';
import { customerReceiptHtml, downloadFile } from '../../shared/download';
import { getOrder } from '../../stores/orderStore';

type Status = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served';

const STEPS: { key: Status; label: string; sub: string; icon: string }[] = [
  { key: 'confirmed', label: 'Order Received', sub: 'Natanggap na ang inyong order', icon: '📥' },
  { key: 'preparing', label: 'Inihahanda', sub: 'Niluluto na ng aming kusina', icon: '👨‍🍳' },
  { key: 'ready', label: 'Handa Na', sub: 'Ibibigay na ng aming kawani', icon: '✅' },
  { key: 'served', label: 'Nai-serve Na', sub: 'Enjoy your meal, kain na!', icon: '🍽' },
];

const STATUS_ORDER: Status[] = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

@Component({
  selector: 'app-order-status',
  imports: [CustomerLayout, NumPipe],
  templateUrl: './order-status.html',
})
export class OrderStatus implements OnDestroy {
  private router = inject(Router);
  tableId = input<string>();

  steps = STEPS;
  // Re-render periodically, as the React version did, so status changes show up.
  private iv = setInterval(() => {}, 2000);

  ngOnDestroy() { clearInterval(this.iv); }

  get order() { return getOrder(); }
  get currentIdx() { return STATUS_ORDER.indexOf(this.order!.status); }
  get subtotal() { return this.order!.total; }
  get serviceCharge() { return Math.round(this.subtotal * 0.05 / 1.05); }

  stepDone(key: Status) { return STATUS_ORDER.indexOf(key) <= this.currentIdx; }
  stepActive(key: Status) {
    const status = this.order!.status;
    return key === status || (key === 'confirmed' && status === 'pending');
  }

  goToMenu() { this.router.navigate([`/table/${this.tableId()}/menu`]); }

  downloadReceipt() {
    const order = this.order!;
    const html = customerReceiptHtml({
      title: order.id,
      meta: [['Order', order.id], ['Table', order.tableId]],
      rows: order.items.map(({ item, quantity }) => ({ name: item.name, quantity, amount: item.price * quantity })),
      total: order.total,
    });
    downloadFile(html, `receipt-${order.id}.html`);
  }
}
