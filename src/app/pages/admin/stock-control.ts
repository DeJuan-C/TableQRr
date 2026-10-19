import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminLayout } from '../../layouts/admin-layout';
import { categories, menuItems, type Category } from '../../data/menu';
import { getIngredients, getRecipeMappings, stockStatus } from '../../stores/inventoryStore';

const CATEGORY_EMOJI: Record<Category, string> = {
  'Sabaw': '🍲', 'Ulam': '🍖', 'Kanin & Pansit': '🍚',
  'Pampagana': '🥗', 'Merienda': '🍮', 'Inumin': '🥤',
};

@Component({
  selector: 'app-stock-control',
  imports: [AdminLayout, FormsModule],
  templateUrl: './stock-control.html',
})
export class StockControl {
  activeCategory: Category | 'All' = 'All';
  search = '';
  emoji = CATEGORY_EMOJI as Record<string, string>;
  tabs: (Category | 'All')[] = ['All', ...categories];

  // Derive availability: a dish is unavailable if any mapped ingredient is Critical
  private isDishAvailable(menuItemId: string): { available: boolean; reason?: string } {
    const recipe = getRecipeMappings().find(r => r.menuItemId === menuItemId);
    if (!recipe) return { available: true }; // no recipe mapped — assume available
    for (const line of recipe.ingredients) {
      const ing = getIngredients().find(i => i.id === line.ingredientId);
      if (ing && stockStatus(ing) === 'Critical') {
        return { available: false, reason: ing.name };
      }
    }
    return { available: true };
  }

  get enriched() {
    return menuItems.map(m => {
      const { available, reason } = this.isDishAvailable(m.id);
      return { ...m, available, unavailableReason: reason };
    });
  }

  get filtered() {
    return this.enriched.filter(m => {
      const matchCat = this.activeCategory === 'All' || m.category === this.activeCategory;
      const matchSearch = !this.search || m.name.toLowerCase().includes(this.search.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  get unavailableCount() { return this.enriched.filter(m => !m.available).length; }

  tabCount(cat: Category | 'All') {
    return cat === 'All'
      ? this.unavailableCount
      : this.enriched.filter(m => m.category === cat && !m.available).length;
  }
}
