import { menuItems as seedItems, type MenuItem, type Category } from '../data/menu';

export type { MenuItem, Category };

export interface MenuModifier {
  id: string;
  name: string;
  options: { label: string; addPrice: number }[];
  required: boolean;
}

export interface ManagedMenuItem extends MenuItem {
  modifiers: MenuModifier[];
  tags: string[];
}

// Seed with existing menu, adding empty modifiers/tags
let items: ManagedMenuItem[] = seedItems.map(m => ({
  ...m,
  modifiers: [],
  tags: m.popular ? ['popular'] : [],
}));

// Pre-seed a couple of modifiers for demo
items = items.map(m => {
  if (m.id === 'm4') return { ...m, modifiers: [{ id: 'md1', name: 'Spice Level', options: [{ label: 'Mild', addPrice: 0 }, { label: 'Extra Garlic', addPrice: 0 }], required: false }] };
  if (m.id === 'm7') return { ...m, modifiers: [{ id: 'md2', name: 'Extra', options: [{ label: 'Extra Rice', addPrice: 30 }, { label: 'Add Egg', addPrice: 20 }], required: false }] };
  return m;
});

type Listener = () => void;
const listeners: Listener[] = [];
function notify() { listeners.forEach(fn => fn()); }

export function getMenuItems() { return items; }

export function saveMenuItem(item: ManagedMenuItem) {
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items = items.map(i => i.id === item.id ? item : i);
  else items = [item, ...items];
  notify();
}

export function deleteMenuItem(id: string) {
  items = items.filter(i => i.id !== id);
  notify();
}

export function toggleAvailable(id: string) {
  items = items.map(i => i.id === id ? { ...i, available: !i.available } : i);
  notify();
}

