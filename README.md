# BPL Dallas – Season 1 Bidding App

A real-time PWA for managing the Brownish Premier League Dallas Season 1 player auction.

---

## Setup Instructions

### 1. Supabase – Run the schema

1. Go to [supabase.com](https://supabase.com) and open your project
2. Navigate to **SQL Editor**
3. Paste the contents of `supabase_schema.sql` and click **Run**
4. This creates the `captains` and `players` tables and seeds all 6 captains

### 2. Deploy to GitHub Pages

1. Push all files to your `BPL-Dallas` GitHub repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder `/`
4. Your app will be live at `https://YOUR_USERNAME.github.io/BPL-Dallas/`

> **Note:** PWA icons (`icon-192.png` and `icon-512.png`) are referenced in the manifest. Add your own 192×192 and 512×512 PNG icons to the repo root, or remove the `icons` field from `manifest.json` to skip PWA install support.

---

## Usage

### Admin
- URL: `https://YOUR_USERNAME.github.io/BPL-Dallas/`
- Username: `Admin`
- Password: `bpladmin123`

**Admin tabs:**
- **Overview** – See all captains, their remaining purse, and current rosters. Unassign players if needed.
- **Players** – Add players to the pool (Group A/B/C). Delete players.
- **Assign** – Assign a sold player to a captain at a given price. Purse is automatically deducted.

### Captains
| Name    | Username | Password    | Group | Starting Purse |
|---------|----------|-------------|-------|----------------|
| Aashay  | Aashay   | Aashay123   | A     | 800 pts        |
| Soham M | SohamM   | SohamM123   | A     | 800 pts        |
| Nayen   | Nayen    | Nayen123    | B     | 1,000 pts      |
| Vedant  | Vedant   | Vedant123   | B     | 1,000 pts      |
| Aryan   | Aryan    | Aryan123    | C     | 1,200 pts      |
| Tushar  | Tushar   | Tushar123   | C     | 1,200 pts      |

Captains see:
- Their own remaining purse
- Their team roster
- All other captains' purses and rosters (live, updates in real time)

---

## Group Base Prices

| Group | Base Price |
|-------|-----------|
| A     | 200 pts   |
| B     | 100 pts   |
| C     | 50 pts    |

Groups are visible to admin only — captains see players by name only.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Login page |
| `captain.html` | Captain view |
| `admin.html` | Admin control panel |
| `style.css` | Global styles |
| `auth.js` | Login logic |
| `supabase-config.js` | Supabase connection |
| `supabase_schema.sql` | Database schema + seed |
| `manifest.json` | PWA manifest |
