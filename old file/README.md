# AutoScope Admin Console

A React admin dashboard for the AutoScope platform team. It is built from the AutoScope Functional Specification Document (v1.0), mainly sections 3.13 (Administration), 6 (Data), 8 (Roles) and the admin-facing parts of the other modules.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # opens http://localhost:5173
npm run build    # production build in dist/
```

The app runs on demo data, so no backend is needed.

## What's in it

| Page | Route | FSD requirements |
| --- | --- | --- |
| Overview: queue lamps, GMV by category, active users, live towing jobs | `/` | FR-13.5, FR-6.4, FR-6.6 |
| Provider verification: KYC documents, ID-check flags, approve or reject | `/verification` | FR-1.4, FR-13.1 |
| Listing review: vehicles, parts, services, insurance products | `/listings` | FR-3, FR-4, FR-5.1, FR-7.1, FR-13.1, FR-13.2 |
| Reported content: listings, reviews, accounts | `/reports` | FR-11.4, FR-13.2 |
| Disputes: case timeline, investigate, resolve with an escrow outcome | `/disputes` | FR-13.4, FR-9.2 |
| Users and user profile: roles, KYC, suspend or reinstate, security events | `/users`, `/users/:id` | FR-1.3, FR-1.7, FR-13.2 |
| Orders and jobs: parts orders, vehicle sales, bookings, haulage, policies | `/activity` | FR-9, FR-10 |
| Payouts and fees: commission per category, payout schedule, release or hold payouts | `/finance` | FR-9.5, FR-13.3 |
| Announcements: push, SMS and email with audience targeting and scheduling | `/announcements` | FR-13.6, FR-12.2 |
| Audit log with CSV export | `/audit` | FR-1.7 |

Every admin action (approve, reject, suspend, resolve, release, send) updates the UI and writes an entry to the audit log.

## Project structure

```
src/
  main.jsx              App entry: router and store provider
  App.jsx               Routes
  styles.css            Design tokens (light and dark), layout and components
  data/
    mock.js             Demo data shaped after FSD section 6 entities
    store.jsx           App state and every admin action, in one place
  lib/format.js         Naira, date and number formatting
  components/
    Layout.jsx          Sidebar, top bar, toasts
    DataTable.jsx       Sortable, paginated, selectable table
    charts.jsx          SVG charts (no chart library)
    ui.jsx              Badge, Button, Drawer, Tabs, inputs and more
    Icon.jsx            Built-in icon set
  pages/                One file per screen
```

Dependencies are deliberately few: React, React DOM and React Router. Charts and icons are hand-built SVG.

## Connecting the real backend

All data reads and writes go through `src/data/store.jsx`, so that's the only place you need to change:

1. Replace the `initialState` values from `mock.js` with data fetched from your API (for example in a `useEffect` inside `StoreProvider`, or with TanStack Query).
2. In each action (`decideKyc`, `setListingStatus`, `updateDispute`, `setPayouts` and so on), call your endpoint first, then dispatch the same action with the server response.
3. Add authentication in front of the app. FSD 5.2 calls for RBAC, so the console should only load for platform admin accounts.

Suggested endpoints, one per action:

```
POST /admin/kyc/:id/approve           POST /admin/kyc/:id/reject {reason}
PATCH /admin/listings/:id {status}    PATCH /admin/users/:id {status, reason}
PATCH /admin/disputes/:id {status, resolution, note}
PATCH /admin/reports/:id {status}     PUT /admin/commission/:category {rate, cap}
PUT /admin/payout-schedule            POST /admin/payouts/release {ids}
POST /admin/announcements             GET /admin/audit-log?kind=&q=
```

## Notes

- Currency is Naira and text is English, per the FSD's launch market. Formatting lives in `src/lib/format.js`.
- Dark mode follows the operating system setting.
- Open issues from FSD 10.2 (gateway choice, final commission rates, escrow scope) are configurable in the UI rather than hard-coded.
