import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { INVENTORY_NAV, StaffLayout } from '../../layouts/staff-layout';
import { menuItems } from '../../data/menu';
import { getIngredients, getRecipeMappings, saveRecipeMapping, type RecipeIngredient } from '../../stores/inventoryStore';

@Component({
  selector: 'app-recipe-mapping',
  imports: [StaffLayout, FormsModule],
  templateUrl: './recipe-mapping.html',
})
export class RecipeMapping {
  nav = INVENTORY_NAV;
  menuItems = menuItems;

  selectedMenuId: string = menuItems[0]?.id ?? '';
  editLines: RecipeIngredient[] | null = null;
  editing = false;

  get ingredients() { return getIngredients(); }
  get recipeMappings() { return getRecipeMappings(); }
  get selectedItem() { return menuItems.find(m => m.id === this.selectedMenuId); }
  get existingMapping() { return this.recipeMappings.find(r => r.menuItemId === this.selectedMenuId); }
  get lines() { return this.editLines ?? this.existingMapping?.ingredients ?? []; }
  get displayLines() { return this.editing ? this.editLines ?? [] : this.lines; }

  hasMapped(id: string) { return this.recipeMappings.some(r => r.menuItemId === id); }
  ingredient(id: string) { return this.ingredients.find(i => i.id === id); }

  // Cost preview
  get costPerServing() {
    return this.lines.reduce((sum, l) => {
      const ing = this.ingredient(l.ingredientId);
      return ing ? sum + ing.unitCost * l.qtyPerServing : sum;
    }, 0);
  }

  selectItem(id: string) {
    this.selectedMenuId = id;
    this.editing = false;
    this.editLines = null;
  }

  startEdit() {
    // Copy each line so edits don't touch the saved mapping until Save
    this.editLines = (this.existingMapping?.ingredients ?? []).map(l => ({ ...l }));
    this.editing = true;
  }

  addLine() {
    this.editLines = [...(this.editLines ?? []), { ingredientId: this.ingredients[0]?.id ?? '', qtyPerServing: 0 }];
  }

  removeLine(idx: number) {
    this.editLines = (this.editLines ?? []).filter((_, i) => i !== idx);
  }

  handleSave() {
    const item = this.selectedItem;
    if (!item || this.editLines === null) return;
    saveRecipeMapping({
      menuItemId: this.selectedMenuId,
      menuItemName: item.name,
      ingredients: this.editLines
        .map(l => ({ ...l, qtyPerServing: +l.qtyPerServing }))
        .filter(l => l.ingredientId && l.qtyPerServing > 0),
    });
    this.editing = false;
    this.editLines = null;
  }

  cancel() {
    this.editing = false;
    this.editLines = null;
  }
}
