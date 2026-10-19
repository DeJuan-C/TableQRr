import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminLayout } from '../../layouts/admin-layout';
import { QrCode } from '../../shared/qr-code';

interface Table {
  id: string;
  label: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

function generateToken(tableId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return btoa(`${tableId}:${ts}:${rand}`).replace(/=/g, '').slice(0, 24);
}

const INITIAL_TABLES: Table[] = [
  { id: 'T01', label: 'Table 1', token: generateToken('T01'), createdAt: new Date(), expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), active: true },
  { id: 'T02', label: 'Table 2', token: generateToken('T02'), createdAt: new Date(), expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), active: true },
  { id: 'T03', label: 'Table 3', token: generateToken('T03'), createdAt: new Date(), expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), active: false },
];

@Component({
  selector: 'app-admin-qr',
  imports: [AdminLayout, FormsModule, QrCode],
  templateUrl: './admin-qr.html',
})
export class AdminQR {
  tables: Table[] = INITIAL_TABLES;
  selectedTable: Table | null = INITIAL_TABLES[0];
  newLabel = '';
  showAddForm = false;

  get stats() {
    return [
      { label: 'Total Tables', value: this.tables.length },
      { label: 'Active Sessions', value: this.tables.filter(t => t.active).length },
      { label: 'Inactive', value: this.tables.filter(t => !t.active).length },
      { label: 'Session Duration', value: '4 hrs' },
    ];
  }

  getTableUrl(table: Table): string {
    return `${window.location.origin}/table/${table.id}/menu?token=${table.token}`;
  }

  formatExpiry(date: Date) {
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  }

  addTable() {
    if (!this.newLabel.trim()) return;
    const id = `T${String(this.tables.length + 1).padStart(2, '0')}`;
    const newTable: Table = {
      id,
      label: this.newLabel.trim(),
      token: generateToken(id),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      active: true,
    };
    this.tables = [...this.tables, newTable];
    this.selectedTable = newTable;
    this.newLabel = '';
    this.showAddForm = false;
  }

  private updateTable(tableId: string, change: (t: Table) => Table) {
    this.tables = this.tables.map(t => {
      if (t.id !== tableId) return t;
      const updated = change(t);
      if (this.selectedTable?.id === tableId) this.selectedTable = updated;
      return updated;
    });
  }

  regenerateToken(tableId: string) {
    this.updateTable(tableId, t => ({
      ...t,
      token: generateToken(tableId),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      active: true,
    }));
  }

  toggleActive(tableId: string) {
    this.updateTable(tableId, t => ({ ...t, active: !t.active }));
  }

  print() { window.print(); }
}
