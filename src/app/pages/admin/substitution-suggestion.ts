import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminLayout } from '../../layouts/admin-layout';
import { menuItems, type Category, type MenuItem } from '../../data/menu';
import { getMenuItems } from '../../stores/menuStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubstitutionRule {
  unavailableId: string;
  preferredSubstituteId?: string;   // Head Chef pre-configured
  excludedIds: string[];
}

interface SubLog {
  unavailableId: string;
  unavailableName: string;
  shownIds: string[];
  acceptedId?: string;
  at: Date;
}

// ─── Category adjacency for ranking ──────────────────────────────────────────

const CATEGORY_RANK: Record<Category, number> = {
  'Sabaw':          1,
  'Ulam':           2,
  'Kanin & Pansit': 3,
  'Pampagana':      4,
  'Merienda':       5,
  'Inumin':         6,
};

function categoryDistance(a: Category, b: Category) {
  return Math.abs(CATEGORY_RANK[a] - CATEGORY_RANK[b]);
}

// ─── Default rules (one per menu item, empty by default) ─────────────────────

const defaultRules: SubstitutionRule[] = menuItems.map(m => ({
  unavailableId: m.id,
  excludedIds: [],
}));

// ─── Substitution log (module-level) ─────────────────────────────────────────

let subLog: SubLog[] = [];

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-substitution-suggestion',
  imports: [AdminLayout, FormsModule],
  templateUrl: './substitution-suggestion.html',
})
export class SubstitutionSuggestion {
  menuItems = menuItems;
  rules: SubstitutionRule[] = defaultRules;
  configItemId: string | null = null;
  log: SubLog[] = [];
  acceptedMap: Record<string, string> = {}; // unavailId → acceptedId

  // Items currently unavailable
  get unavailableItems() { return getMenuItems().filter(m => !m.available); }
  get availableItems() { return getMenuItems().filter(m => m.available); }

  ruleFor(id: string | null) { return this.rules.find(r => r.unavailableId === id); }

  getSuggestions(unavail: MenuItem): MenuItem[] {
    const rule = this.ruleFor(unavail.id);
    const excluded = rule?.excludedIds ?? [];
    const preferred = rule?.preferredSubstituteId;

    const candidates = this.availableItems.filter(a =>
      a.id !== unavail.id && !excluded.includes(a.id)
    );

    candidates.sort((a, b) => {
      // 1. Preferred substitute first
      if (a.id === preferred) return -1;
      if (b.id === preferred) return 1;
      // 2. Same category
      const aSame = a.category === unavail.category ? 0 : 1;
      const bSame = b.category === unavail.category ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      // 3. Category adjacency
      return categoryDistance(a.category, unavail.category) - categoryDistance(b.category, unavail.category);
    });

    return candidates.slice(0, 2);
  }

  ids(items: MenuItem[]) { return items.map(s => s.id); }

  handleAccept(unavailId: string, unavailName: string, acceptedId: string, shownIds: string[]) {
    this.acceptedMap = { ...this.acceptedMap, [unavailId]: acceptedId };
    const entry: SubLog = { unavailableId: unavailId, unavailableName: unavailName, shownIds, acceptedId, at: new Date() };
    subLog = [entry, ...subLog].slice(0, 50);
    this.log = [...subLog];
  }

  handleSkip(unavailId: string, unavailName: string, shownIds: string[]) {
    const entry: SubLog = { unavailableId: unavailId, unavailableName: unavailName, shownIds, at: new Date() };
    subLog = [entry, ...subLog].slice(0, 50);
    this.log = [...subLog];
  }

  // Config helpers
  get configItem() { return this.configItemId ? menuItems.find(m => m.id === this.configItemId) ?? null : null; }
  get configRule() { return this.ruleFor(this.configItemId); }

  toggleConfig(id: string) { this.configItemId = this.configItemId === id ? null : id; }

  preferredOptions(configId: string) {
    const rule = this.configRule;
    return this.availableItems.filter(a => a.id !== configId && !rule?.excludedIds.includes(a.id));
  }
  excludeOptions(configId: string) { return this.availableItems.filter(a => a.id !== configId); }
  isExcluded(id: string) { return this.configRule?.excludedIds.includes(id) ?? false; }

  setPreferred(unavailId: string, preferredId: string | undefined) {
    this.rules = this.rules.map(r => r.unavailableId === unavailId ? { ...r, preferredSubstituteId: preferredId } : r);
  }

  toggleExclude(unavailId: string, excludeId: string) {
    this.rules = this.rules.map(r => {
      if (r.unavailableId !== unavailId) return r;
      const has = r.excludedIds.includes(excludeId);
      return { ...r, excludedIds: has ? r.excludedIds.filter(x => x !== excludeId) : [...r.excludedIds, excludeId] };
    });
  }

  hasConfig(id: string) {
    const rule = this.ruleFor(id);
    return !!(rule?.preferredSubstituteId || (rule?.excludedIds?.length ?? 0) > 0);
  }

  acceptedName(e: SubLog) {
    return e.acceptedId ? menuItems.find(m => m.id === e.acceptedId)?.name : undefined;
  }

  fmtClock(d: Date) { return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }); }

  get acceptedCount() { return this.log.filter(e => e.acceptedId).length; }
  get skippedCount() { return this.log.filter(e => !e.acceptedId).length; }
  get acceptanceRate() { return this.log.length ? Math.round(this.acceptedCount / this.log.length * 100) : 0; }
}
