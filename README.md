# BPL Dallas – Season 1 Bidding App

A real-time PWA for managing the Brownish Premier League Dallas Season 1 player auction.

---

## Setup Instructions

### 1. Supabase – Run the schema

1. Go to [supabase.com](https://supabase.com) and open your project
2. Navigate to **SQL Editor**
3. Paste the contents of `supabase_schema.sql` and click **Run**
4. Then paste and run `supabase_settings.sql` to create the `bidding_state` table
5. This creates all tables and seeds all 6 captains and 28 players

### 2. Deploy to GitHub Pages

1. Push all files to your `BPL-Dallas` GitHub repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder `/`
4. Your app will be live at `https://akierk04.github.io/BPL-Dallas/`

> **Note:** PWA icons (`icon-192.png` and `icon-512.png`) are referenced in the manifest. Add your own 192×192 and 512×512 PNG icons to the repo root, or remove the `icons` field from `manifest.json` to skip PWA install support.

---

## URLs

| Page | URL | Access |
|------|-----|--------|
| Login | https://akierk04.github.io/BPL-Dallas/ | All users |
| Admin | https://akierk04.github.io/BPL-Dallas/admin.html | Admin only |
| Live Board | https://akierk04.github.io/BPL-Dallas/board.html | Public — no login |

---

## Admin

- **Username:** `Admin`
- **Password:** `bpladmin123`

### Admin Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | All 6 captains, remaining purse, spent, and current rosters. Unassign players if needed. |
| **Players** | Add or delete players from the pool. Shows full list with available/sold status. |
| **Bidding** | Select the player currently up for bid. Updates the Live Board in real time for all viewers. |
| **Core Console** | Assign a sold player to a captain at a given price. Purse auto-deducted. Shows budget warning for selected captain. |

---

## Captains

| Name    | Username | Password    | Group | Starting Purse |
|---------|----------|-------------|-------|----------------|
| Aashay  | Aashay   | Aashay123   | A     | 800 pts        |
| Soham M | SohamM   | SohamM123   | A     | 800 pts        |
| Nayen   | Nayen    | Nayen123    | B     | 1,000 pts      |
| Vedant  | Vedant   | Vedant123   | B     | 1,000 pts      |
| Aryan   | Aryan    | Aryan123    | C     | 1,200 pts      |
| Tushar  | Tushar   | Tushar123   | C     | 1,200 pts      |

Captains can see:
- Their own remaining purse + budget warning
- Their team roster
- All other captains' purses, budget warnings, and rosters (live)

---

## Live Board (board.html)

Public view — no login required. Share this URL with all players on the day.

- **Now Bidding** banner — shows the current player up for bid in real time
- **Stats bar** — players sold, available, total points spent
- **Captains & Teams** — all 6 captains with purse, budget warning, and current roster
- **Player Pool** — all 28 players with sold/available status. Filter by All / Available / Sold

---

## Budget Warning System

Each captain must acquire exactly 4 players through bidding (team = captain + 4 players). The minimum cost per remaining slot is 50 points (Group C base price).

**Formula:** `Safe to spend = Wallet − (50 × (remaining slots − 1))`

The `-1` accounts for the fact that the captain is actively bidding on one of those slots right now.

| Indicator | Condition | Message |
|-----------|-----------|---------|
| 🟢 Green | Safe to spend > 200 pts | "Safe to spend: X pts" |
| 🟡 Yellow | Safe to spend 1–200 pts | "Caution: Only X pts safe to spend" |
| 🔴 Red | Safe to spend ≤ 0 | "Warning: Over budget reserve!" |

Shown on: Captain view, Live Board, Admin Core Console.

---

## Group Base Prices (Admin only)

| Group | Base Price |
|-------|-----------|
| A     | 200 pts   |
| B     | 100 pts   |
| C     | 50 pts    |

Groups are visible to admin only — captains and the live board show player names only.

---

## Player Pool (28 players)

### Group A (200 pts base) — 9 players
Akhil R, Sehjbir, Thomson, Thannir, Karthik, Oneil, DJ, Rachit, Subodh

### Group B (100 pts base) — 10 players
Kiran, Jose, Steve, Abhishek K, Zafi, Soham B, Anoop, Sharan, Sanjith, Abhay

### Group C (50 pts base) — 9 players
Nihaal, Chinmay, Akshai, Swapnil, Moksh, Rohit, Shrivatsa, Yash S, Pranav

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Login page |
| `captain.html` | Captain view (login required) |
| `admin.html` | Admin control panel (login required) |
| `board.html` | Public live board (no login) |
| `style.css` | Global styles |
| `auth.js` | Login logic |
| `budget-warning.js` | Shared budget warning calculator |
| `supabase-config.js` | Supabase connection |
| `supabase_schema.sql` | Database schema + captains + players seed |
| `supabase_settings.sql` | Bidding state table setup |
| `manifest.json` | PWA manifest |
