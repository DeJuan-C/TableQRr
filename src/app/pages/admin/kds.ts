import { Component, OnDestroy, input, output } from '@angular/core';
import type { Category } from '../../data/menu';
import { CATEGORY_PREP, advanceTicket, getTickets, type KitchenTicket, type TicketItem } from '../../stores/kitchenStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsedMinutes(since: Date): number {
  return Math.floor((Date.now() - since.getTime()) / 60000);
}

function formatElapsed(since: Date): string {
  const s = Math.floor((Date.now() - since.getTime()) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const CATEGORY_ORDER: Category[] = ['Sabaw', 'Ulam', 'Kanin & Pansit', 'Pampagana', 'Merienda', 'Inumin'];
const CATEGORY_EMOJI: Record<Category, string> = {
  'Sabaw': '🍲', 'Ulam': '🍖', 'Kanin & Pansit': '🍚',
  'Pampagana': '🥗', 'Merienda': '🍮', 'Inumin': '🥤',
};

function groupByCategory(items: TicketItem[]): [Category, TicketItem[]][] {
  const map = new Map<Category, TicketItem[]>();
  for (const cat of CATEGORY_ORDER) {
    const group = items.filter(i => i.category === cat);
    if (group.length) map.set(cat, group);
  }
  return [...map.entries()];
}

// ─── Light-theme status styles ────────────────────────────────────────────────

function statusStyle(status: KitchenTicket['status'], delayed: boolean) {
  if (status === 'served') return {
    cardBg: '#F4ECD8', border: '#C4A882', headerBg: '#E8D5B0',
    text: '#9B7B5A', labelColor: '#C4A882',
    barColor: '#C4A882', badgeBg: '#9B7B5A', badgeText: '#FFF8EE',
    btnBg: '', btnText: '',
  };
  if (status === 'ready') return {
    cardBg: '#F0F7F2', border: '#4A7C5980', headerBg: '#4A7C5918',
    text: '#2C1810', labelColor: '#4A7C59',
    barColor: '#4A7C59', badgeBg: '#4A7C59', badgeText: '#fff',
    btnBg: '#4A7C59', btnText: '#fff',
  };
  if (delayed) return {
    cardBg: '#FDF2F2', border: '#C0392B80', headerBg: '#C0392B12',
    text: '#2C1810', labelColor: '#C0392B',
    barColor: '#C0392B', badgeBg: '#C0392B', badgeText: '#fff',
    btnBg: '#D4A843', btnText: '#2C1810',
  };
  return {
    cardBg: '#FFF8EE', border: '#C4A882', headerBg: '#F4ECD8',
    text: '#2C1810', labelColor: '#D4A843',
    barColor: '#D4A843', badgeBg: '#D4A843', badgeText: '#2C1810',
    btnBg: '#D4A843', btnText: '#2C1810',
  };
}

const NEXT_LABEL: Record<KitchenTicket['status'], string> = {
  preparing: 'Mark Ready ✓',
  ready: 'Mark Served ✓',
  served: 'Served',
};

// ─── Ticket Card ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ticket-card',
  templateUrl: './ticket-card.html',
  host: { class: 'contents' },
})
export class TicketCard implements OnDestroy {
  ticket = input.required<KitchenTicket>();
  advance = output<void>();

  // Ticks every second so elapsed timers update.
  private iv = setInterval(() => {}, 1000);
  ngOnDestroy() { clearInterval(this.iv); }

  emoji = CATEGORY_EMOJI;
  nextLabel = NEXT_LABEL;
  formatTime = formatTime;

  get elapsed() { return elapsedMinutes(this.ticket().receivedAt); }
  get elapsedLabel() { return formatElapsed(this.ticket().receivedAt); }
  get delayed() { return this.ticket().status === 'preparing' && this.elapsed > this.ticket().expectedPrepMinutes; }
  get s() { return statusStyle(this.ticket().status, this.delayed); }
  get groups() { return groupByCategory(this.ticket().items); }
  get progress() { return Math.min(100, (this.elapsed / this.ticket().expectedPrepMinutes) * 100); }
  get lastAt() { const h = this.ticket().statusHistory; return h[h.length - 1].at; }

  capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
}

// ─── KDS Main ─────────────────────────────────────────────────────────────────

type Filter = 'all' | 'preparing' | 'ready' | 'served';

@Component({
  selector: 'app-kds',
  imports: [TicketCard],
  templateUrl: './kds.html',
})
export class KDS implements OnDestroy {
  filter: Filter = 'all';
  groupByCat = false;
  time = new Date();
  private iv = setInterval(() => (this.time = new Date()), 1000);
  ngOnDestroy() { clearInterval(this.iv); }

  emoji = CATEGORY_EMOJI;
  prep = CATEGORY_PREP;
  advanceTicket = advanceTicket;

  get clock() {
    return this.time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }
  get tickets() { return getTickets(); }
  get visible() { return this.tickets.filter(t => this.filter === 'all' || t.status === this.filter); }
  get delayed() {
    return this.tickets.filter(t => t.status === 'preparing' && elapsedMinutes(t.receivedAt) > t.expectedPrepMinutes).length;
  }
  get tabs() {
    const count = (s: string) => this.tickets.filter(t => t.status === s).length;
    return [
      { key: 'all' as Filter,       label: 'All',       count: this.tickets.length, color: '#7A3B1E' },
      { key: 'preparing' as Filter, label: 'Preparing', count: count('preparing'),  color: '#D4A843' },
      { key: 'ready' as Filter,     label: 'Ready',     count: count('ready'),      color: '#4A7C59' },
      { key: 'served' as Filter,    label: 'Served',    count: count('served'),     color: '#9B7B5A' },
    ];
  }
  get categoryLanes(): [Category, KitchenTicket[]][] {
    return CATEGORY_ORDER
      .map(cat => [cat, this.visible.filter(t => t.items.some(i => i.category === cat))] as [Category, KitchenTicket[]])
      .filter(([, ts]) => ts.length > 0);
  }
}
