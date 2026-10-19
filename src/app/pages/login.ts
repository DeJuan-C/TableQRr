import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { addAuditEvent, getUsers, type Role } from '../stores/userStore';
import { SupabaseService } from '../shared/supabase.service';

type Step = 'role' | 'form';

interface RoleCard {
  role: Role | 'Kitchen';
  icon: string;
  title: string;
  sub: string;
  redirectTo: string;
  accent: string;
  accentText: string;
  accentBorder: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: 'Admin',
    icon: '👑',
    title: 'Staff',
    sub: 'Full system access — menu, users, analytics, and all modules',
    redirectTo: '/admin/home',
    accent: '#7A3B1E',
    accentText: '#FFF8EE',
    accentBorder: '#5C2E0A',
  },
  {
    role: 'Cashier',
    icon: '🖥',
    title: 'Cashier',
    sub: 'POS terminal, bill settlement, discounts, receipts, and day closing',
    redirectTo: '/cashier/pos',
    accent: '#4A7C59',
    accentText: '#FFF8EE',
    accentBorder: '#3A6047',
  },
  {
    role: 'Kitchen',
    icon: '👨‍🍳',
    title: 'Kitchen Staff',
    sub: 'Kitchen display, order queue, and stock availability control',
    redirectTo: '/admin/kds',
    accent: '#8B6914',
    accentText: '#FFF8EE',
    accentBorder: '#6B4F0E',
  },
];

// Demo password — all accounts share this for the prototype
const DEMO_PASSWORD = 'kainan2024';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  roleCards = ROLE_CARDS;
  step: Step = 'role';
  card: RoleCard | null = null;
  username = '';
  password = '';
  showPass = false;
  supabaseMode = false;
  error = '';
  loading = false;

  handleRoleSelect(card: RoleCard) {
    this.card = card;
    this.username = '';
    this.password = '';
    this.supabaseMode = false;
    this.error = '';
    this.step = 'form';
  }

  async handleLogin() {
    this.error = '';
    if (!this.username.trim() || !this.password) { this.error = 'Please enter your username and password.'; return; }

    if (this.supabaseMode) {
      await this.handleSupabaseLogin();
      return;
    }

    const users = getUsers();
    const matchRole = this.card!.role;
    const user = users.find(u =>
      u.username.toLowerCase() === this.username.trim().toLowerCase() &&
      u.role === matchRole &&
      u.active
    );

    if (!user) {
      this.error = 'Username not found or account inactive for this role.';
      return;
    }
    if (this.password !== DEMO_PASSWORD) {
      this.error = 'Incorrect password. Try: kainan2024';
      return;
    }

    this.loading = true;
    addAuditEvent({
      action: 'login',
      userId: user.id,
      userName: user.name,
      detail: `${user.role} login — ${user.username}`,
      severity: 'info',
    });
    setTimeout(() => this.router.navigate([this.card!.redirectTo]), 800);
  }

  private async handleSupabaseLogin() {
    this.loading = true;
    try {
      const user = await this.supabase.signIn(this.username.trim(), this.password);
      const profile = await this.supabase.getCurrentStaffProfile();
      if (!user || !profile || !profile.active) {
        await this.supabase.client.auth.signOut();
        this.error = 'This account has no active staff profile. Ask an administrator for access.';
        return;
      }
      if (profile.role !== this.card!.role.toLowerCase()) {
        await this.supabase.client.auth.signOut();
        this.error = `This account is assigned the ${profile.role} role, not ${this.card!.role}.`;
        return;
      }

      try {
        await this.supabase.recordStaffAuthEvent('staff_signed_in');
      } catch (error) {
        const { error: signOutError } = await this.supabase.client.auth.signOut();
        if (signOutError) {
          throw new Error(`Sign-in could not be audited, and sign-out also failed: ${signOutError.message}`);
        }
        throw new Error(`Sign-in could not be recorded in the audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      await this.router.navigate([this.card!.redirectTo]);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Supabase sign-in failed.';
    } finally {
      this.loading = false;
    }
  }

  get placeholder() {
    if (this.supabaseMode) return 'staff@example.com';
    const role = this.card?.role;
    return role === 'Admin' ? 'e.g. nene.admin' : role === 'Cashier' ? 'e.g. rosa.cashier' : 'e.g. tino.kitchen';
  }
}
