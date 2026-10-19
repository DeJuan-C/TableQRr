# Kainan Kay Aling Nene — Angular

An Angular 20 conversion of the Figma Make project **"Filipino Restaurant Website Pages"** (originally React + Tailwind). All 35 pages, the routes and the demo data are carried over 1:1.

## Run it in VS Code

1. Open this folder in VS Code (**File → Open Folder…**).
2. Install the recommended extension when prompted (**Angular Language Service**).
3. Open a terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install
   npm start
   ```

4. Open http://localhost:4200

You can also press **F5**, which uses the preconfigured `.vscode/launch.json` to start the server and open a browser.

## Supabase

The app uses the Supabase JavaScript client. Before running a fresh checkout, copy
`public/supabase-config.example.js` to `public/supabase-config.js` and set the project's URL and
publishable key (or legacy anon key) in that file. The local config file is git-ignored. Only use
the browser-safe publishable/anon key here; never put a service-role or secret key in the frontend.

### Staff profiles and role safeguards

The versioned migration in `supabase/migrations/` creates `public.profiles`, linked to
`auth.users`. New Auth users receive an inactive `cashier` profile by default. RLS allows users to
read their own profile and active admins to manage profiles; a database trigger prevents a user
from changing their own role or active status. Profile inserts are created by the Auth trigger,
not by the browser.

Staff invitations are handled by `supabase/functions/admin-invite-user/`. Deploy this Edge
Function with Supabase's managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` secrets; set `APP_ALLOWED_ORIGIN` to the deployed frontend origin
when it is not running at `http://localhost:4200` or `http://127.0.0.1:4200`. The service-role
key must remain a server-side secret. The function requires a valid Supabase session from an
active admin and sends an Auth invitation before assigning the requested role. JWT gateway
verification is disabled for this function because it validates the bearer token itself with
Supabase Auth; keep that server-side validation in place.

To bootstrap the first administrator, create/invite a real staff Auth account in Supabase
Authentication, then promote that account's generated profile to `admin` and set `is_active` to
`true` in the SQL Editor using its verified email:

```sql
update public.profiles as profile
set role = 'admin', is_active = true
from auth.users as auth_user
where profile.user_id = auth_user.id
  and lower(auth_user.email) = lower('ADMIN_EMAIL_FROM_TEAM');
```

A temporary demo bootstrap admin currently exists in the shared hosted project. It uses a
reserved example email and a shared demo password, so it cannot receive invitations and must
be deleted or replaced with a real, privately controlled account before production use.

The staff login screen keeps the in-memory prototype demo login and adds a separate
**Supabase staff account** sign-in option. Supabase sign-in checks that the linked profile is
active and that its role matches the selected staff role. The User & Role Management page then
loads profiles under RLS, lets active admins update staff role/status, and sends new staff
invitations through the protected Edge Function. Invitees must accept the email invitation
before signing in. The admin portal's Log out action clears the Supabase Auth session.

That page does not display mocked login sessions or IP/device details. The prototype demo
accounts remain in-memory and cannot administer Supabase profiles. Do not promote sample/demo
accounts or share their passwords; the `SupabaseService.inviteStaffUser()` helper requires an
active Supabase admin session.

### Audit log

`supabase/migrations/20261019160000_create_staff_audit_log.sql` adds a protected `public.audit_log`
table. Active admins can read it, while normal authenticated clients cannot update or delete
records. Sign-in/sign-out events use a constrained database function, profile changes use a
database trigger, and invitations are recorded by the protected Edge Function. Database menu
inserts/deletes/price changes and bill status changes to `voided` are captured by database
triggers in the same transaction as the underlying change. Events include timestamps, the
available authenticated staff identity, summaries, and structured event details.

The Angular `/admin/audit` page reads the real table and supports event/severity/actor filtering,
paging, and CSV export. The existing browser menu and cashier pages still operate on in-memory
prototype data, so their interactions are **not** captured by database triggers. The current
Supabase schema has no persisted discount-application data, so discount audit capture remains
an explicit gap until that workflow is implemented against a database table. Database changes
made outside an authenticated staff session are labeled as unattributed rather than assigned a
fabricated user. This is not yet complete audit coverage or a production compliance record.

The `/admin/analytics` dashboard reads a deliberately tagged sample sales dataset from Supabase.
The `20261020010000_seed_sample_analytics_orders.sql` migration marks sample orders with
`is_sample` and `sample_key`, creates linked sample order items, bills, and paid payments for the
last 14 days, and grants active admins read access to those sample rows. It does not change
existing orders. The dashboard only includes orders carrying the sample marker; it reports daily
settled sample sales, best sellers, and order-time distribution. Prep-time ranges come from the
existing category benchmarks. Actual kitchen turnaround is not available from the current
persisted schema, which does not record the necessary timestamps. This sample dashboard is not
yet a live sales report.

Apply the new migration to the intended Supabase project before deploying the updated invite
function or using the audit page. The migration is additive and has not been applied automatically.
The staff auth/profile and menu/bill event sources can be tested after deployment; verify every
source against the document's 100% capture target before treating the audit log as authoritative.

## Demo logins

All staff accounts use the password **`kainan2024`**.

| Role    | Username                          | Lands on        |
|---------|-----------------------------------|-----------------|
| Staff   | `nene.admin`                      | `/admin/home`   |
| Cashier | `rosa.cashier` / `ligaya.cashier` | `/cashier/pos`  |
| Kitchen | `tino.kitchen`                    | `/admin/kds`    |

## Pages

| Area      | Routes |
|-----------|--------|
| Public    | `/` · `/login` |
| Customer  | `/table/:tableId/menu` · `/cart` · `/order` · `/payment` |
| Admin     | `/admin/home` · `qr` · `kds` · `stock` · `workload` · `menu` · `floor` · `users` · `audit` · `analytics` · `fire-time` · `substitution` |
| Cashier   | `/cashier/pos` · `bills` · `discount` · `receipts` · `closing` |
| Inventory | `/inventory/ingredients` · `recipes` · `stock` · `variance` · `purchase-orders` |

## Project layout

```
src/
├── styles.css              Global theme + Tailwind v4 (copied from the Figma Make index.css)
└── app/
    ├── app.routes.ts       All routes (mirrors the React <Routes> table)
    ├── data/menu.ts        Menu items & categories
    ├── stores/             In-memory demo data + actions (cashier, inventory, kitchen, menu, order, user)
    ├── layouts/            Admin, customer and staff (cashier/inventory) shells
    ├── shared/             QR code component, number pipe, download helpers
    └── pages/
        ├── home.*, login.*
        ├── customer/       Menu, Cart, Order Status, Payment
        ├── admin/          12 admin/kitchen pages
        ├── cashier/        POS, Bills, Discounts (+ card scanner), Receipts, Day Close
        └── inventory/      Ingredients, Recipes, Stock, Variance, Purchase Orders
```

## How the React code was mapped

- **Components → standalone Angular components**, each with a `.ts` class and an `.html` template. Tailwind classes and inline styles are unchanged, so the pages look the same.
- **`useState` → class fields**; derived values → getters. Angular's default change detection (zone.js) re-renders after clicks, timers and input.
- **Store hooks (`useCartStore()` etc.) → the same module-level store files, minus the React hook.** Pages call the exported functions (`getBills()`, `settleBill()`, …) directly.
- **React Router → Angular Router.** URL params (`:tableId`) and query params (`?highlight=`, `?bill=`) arrive as component inputs via `withComponentInputBinding()`.
- **`qrcode.react` → `shared/qr-code.ts`**, a small wrapper around the `qrcode` npm package.

As in the original prototype, all data is in memory, so a full page refresh resets it.

## Build

```bash
npm run build
```

The output goes to `dist/filipino-restaurant/`.
