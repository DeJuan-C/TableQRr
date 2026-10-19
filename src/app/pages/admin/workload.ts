import { Component, OnDestroy } from '@angular/core';
import { AdminLayout } from '../../layouts/admin-layout';
import { categories, type Category } from '../../data/menu';
import { CATEGORY_PREP, getTickets, hourlyCounts } from '../../stores/kitchenStore';

const CATEGORY_EMOJI: Record<Category, string> = {
  'Sabaw': '🍲', 'Ulam': '🍖', 'Kanin & Pansit': '🍚',
  'Pampagana': '🥗', 'Merienda': '🍮', 'Inumin': '🥤',
};

@Component({
  selector: 'app-workload',
  imports: [AdminLayout],
  templateUrl: './workload.html',
})
export class Workload implements OnDestroy {
  categories = categories;
  emoji = CATEGORY_EMOJI;
  prep = CATEGORY_PREP;
  counts: number[] = hourlyCounts;
  now = new Date();
  private iv = setInterval(() => (this.counts = [...hourlyCounts]), 5000);
  ngOnDestroy() { clearInterval(this.iv); }

  // Generate hour labels (last 12 hours)
  hourLabels = Array.from({ length: 12 }, (_, i) => {
    const h = (this.now.getHours() - 11 + i + 24) % 24;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${suffix}`;
  });

  get maxCount() { return Math.max(...this.counts, 1); }
  get peakIdx() { return this.counts.indexOf(Math.max(...this.counts)); }
  get totalOrders() { return this.counts.reduce((a, b) => a + b, 0); }

  get stats() {
    const tickets = getTickets();
    return [
      { label: 'Orders Today', value: this.totalOrders, sub: 'total processed', icon: '📋' },
      { label: 'Active Tickets', value: tickets.filter(t => t.status !== 'served').length, sub: 'in kitchen now', icon: '🔥' },
      { label: 'Peak Hour', value: this.hourLabels[this.peakIdx], sub: `${this.counts[this.peakIdx]} orders`, icon: '⏰' },
      { label: 'Avg / Hour', value: Math.round(this.totalOrders / 12), sub: 'last 12 hours', icon: '📊' },
    ];
  }

  barHeight(count: number) { return Math.max((count / this.maxCount) * 100, 2); }
  barColor(i: number) { return i === this.peakIdx ? '#7A3B1E' : i === 11 ? '#C8955A' : '#E8D5B0'; }

  // Category breakdown from live tickets
  catCount(cat: Category) { return getTickets().filter(t => t.items.some(i => i.category === cat)).length; }

  // PrepTimeBar geometry (scale is 0–30 min)
  prepLeft(cat: Category) { return (this.prep[cat].min / 30) * 100; }
  prepWidth(cat: Category) { return ((this.prep[cat].max - this.prep[cat].min) / 30) * 100; }
}
