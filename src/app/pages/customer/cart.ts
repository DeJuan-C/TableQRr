import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerLayout } from '../../layouts/customer-layout';
import { NumPipe } from '../../shared/num.pipe';
import { getCart, removeFromCart, submitOrder, updateQty } from '../../stores/orderStore';

@Component({
  selector: 'app-cart',
  imports: [CustomerLayout, NumPipe],
  templateUrl: './cart.html',
})
export class Cart {
  private router = inject(Router);
  tableId = input<string>();

  updateQty = updateQty;
  removeFromCart = removeFromCart;

  get cartItems() { return getCart(); }
  get subtotal() { return this.cartItems.reduce((sum, c) => sum + c.item.price * c.quantity, 0); }
  get serviceCharge() { return Math.round(this.subtotal * 0.05); }
  get total() { return this.subtotal + this.serviceCharge; }

  goToMenu() { this.router.navigate([`/table/${this.tableId()}/menu`]); }

  handleOrder() {
    const tableId = this.tableId();
    if (!this.cartItems.length || !tableId) return;
    submitOrder(tableId);
    this.router.navigate([`/table/${tableId}/payment`]);
  }
}
