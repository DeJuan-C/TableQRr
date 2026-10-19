import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Category } from '../../data/menu';
import { deleteMenuItem, getMenuItems, saveMenuItem, toggleAvailable, type ManagedMenuItem } from '../../stores/menuStore';
import { addAuditEvent } from '../../stores/userStore';

const CATEGORIES: Category[] = ['Pampagana', 'Sabaw', 'Ulam', 'Kanin & Pansit', 'Merienda', 'Inumin'];
const CAT_COLOR: Record<Category, string> = {
  'Pampagana': '#7A3B1E', 'Sabaw': '#4A7C59', 'Ulam': '#8B6914',
  'Kanin & Pansit': '#5C2E0A', 'Merienda': '#C0392B', 'Inumin': '#2C6080',
};

const BLANK: ManagedMenuItem = {
  id: '', name: '', description: '', price: 0, category: 'Ulam',
  available: true, popular: false, image: '', modifiers: [], tags: [],
};

@Component({
  selector: 'app-menu-manager',
  imports: [RouterLink, FormsModule],
  templateUrl: './menu-manager.html',
})
export class MenuManager {
  categories = CATEGORIES;
  catColor = CAT_COLOR;
  filterCat: Category | 'All' = 'All';
  search = '';
  form: ManagedMenuItem = structuredClone(BLANK);
  showForm = false;
  isNew = false;
  confirmDelete: string | null = null;

  toggleAvailable = toggleAvailable;

  get items() { return getMenuItems(); }

  get visible() {
    return this.items.filter(i => {
      const matchCat = this.filterCat === 'All' || i.category === this.filterCat;
      const matchSearch = !this.search || i.name.toLowerCase().includes(this.search.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  count(c: Category) { return this.items.filter(i => i.category === c).length; }

  openNew() {
    this.form = { ...structuredClone(BLANK), id: `m${this.items.length + 1}` };
    this.isNew = true;
    this.showForm = true;
  }

  openEdit(item: ManagedMenuItem) {
    this.form = structuredClone(item);
    this.isNew = false;
    this.showForm = true;
  }

  handleSave() {
    const form = this.form;
    if (!form.name || !form.price) return;
    const wasExisting = this.items.find(i => i.id === form.id);
    if (wasExisting && wasExisting.price !== form.price) {
      addAuditEvent({ action: 'price_change', userId: 'U01', userName: 'Nene Reyes', detail: `${form.name}: ₱${wasExisting.price} → ₱${form.price}`, severity: 'warn' });
    } else {
      addAuditEvent({ action: 'menu_add', userId: 'U01', userName: 'Nene Reyes', detail: `${this.isNew ? 'Added' : 'Updated'}: ${form.name}`, severity: 'info' });
    }
    saveMenuItem(form);
    this.showForm = false;
  }

  handleDelete(id: string) {
    const item = this.items.find(i => i.id === id);
    if (item) addAuditEvent({ action: 'menu_delete', userId: 'U01', userName: 'Nene Reyes', detail: `Deleted: ${item.name}`, severity: 'warn' });
    deleteMenuItem(id);
    this.confirmDelete = null;
  }

  closeOnBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm = false;
  }

  addModifier() {
    this.form.modifiers.push({ id: `md${Date.now()}`, name: '', options: [{ label: '', addPrice: 0 }], required: false });
  }
  removeModifier(idx: number) { this.form.modifiers.splice(idx, 1); }
  addOption(modIdx: number) { this.form.modifiers[modIdx].options.push({ label: '', addPrice: 0 }); }
  removeOption(modIdx: number, optIdx: number) { this.form.modifiers[modIdx].options.splice(optIdx, 1); }
}
