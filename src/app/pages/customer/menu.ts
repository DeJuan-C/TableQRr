import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerLayout } from '../../layouts/customer-layout';
import { NumPipe } from '../../shared/num.pipe';
import { categories, menuItems, type Category, type MenuItem } from '../../data/menu';
import { addToCart } from '../../stores/orderStore';

@Component({
  selector: 'app-menu',
  imports: [CustomerLayout, FormsModule, NumPipe],
  templateUrl: './menu.html',
})
export class Menu {
  tableId = input<string>();

  categories = categories;
  activeCategory: Category = 'Ulam';
  addedId: string | null = null;
  search = '';

  get filtered() {
    return menuItems.filter(item => {
      const matchCat = item.category === this.activeCategory;
      const matchSearch = !this.search || item.name.toLowerCase().includes(this.search.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  selectCategory(cat: Category) {
    this.activeCategory = cat;
    this.search = '';
  }

  handleAdd(item: MenuItem) {
    if (!item.available) return;
    addToCart(item);
    this.addedId = item.id;
    setTimeout(() => (this.addedId = null), 1200);
  }
}
