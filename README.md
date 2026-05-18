# BPL Dallas – Brownish Premier League

A real-time PWA for managing the Brownish Premier League Dallas player auction, live board, match results, and standings.

**Live URL:** https://www.bpldallas.team  
**GitHub repo:** https://github.com/akierk04/BPL-Dallas  
**Supabase project:** https://mpwzvdydhyzukwwzhhba.supabase.co

---

## Pages

| Page | URL | Access |
|------|-----|--------|
| Login | https://www.bpldallas.team | All users |
| Admin | https://www.bpldallas.team/admin.html | Admin only |
| Captain | https://www.bpldallas.team/captain.html | Captains (login required) |
| Live Board | https://www.bpldallas.team/board.html | Public — no login |

**Admin credentials:** Username `Admin` / Password `bpladmin123`

---

## Season 2 (Current) — June 2026

### Format
- **10 teams**, 2 groups of 5 (Group A, Group B)
- **Group stage:** Full round-robin within each group (10 matches per group)
- **Super 8:** A2 vs B5, B2 vs A5, A3 vs B4, B3 vs A4
- **Super 4:** W(S8A) vs W(S8D), W(S8B) vs W(S8C)
- **Semi-Finals:** Home & Away legs — SF1: B1 vs W(S4B), SF2: A1 vs W(S4A)
- **Final:** SF1 winner vs SF2 winner

### Auction Rules
- Squad: captain + 5 bid players = 6 total
- 5 player groups: G1=500pts, G2=400pts, G3=300pts, G4=200pts, G5=100pts base
- Each captain must fill one slot from each of the other 4 groups (cannot bid on own group)
- Bid increment: 50pts

### Admin Tabs
| Tab | Purpose |
|-----|---------|
| **Auction Control** | Set player live, close bidding, manual assign, undo sale |
| **Overview** | All captains, purses, rosters, unassign players |
| **Players** | Add/delete players, change group/status |
| **Matches** | Generate fixtures, enter results, goal scorers, MVP |
| **Standings** | Live group standings |
| **Stats** | Top scorers, tournament MVP |
| **Schedule** | Full fixture list + knockout bracket |
| **Payments** | Weekly game dues tracking |
| **Hall of Fame** | Season-by-season archive |

---

## Season 1 — May 2026

### Format
- **8 teams**, 2 groups of 4 (Group 1, Group 2)
- **Group stage:** Round-robin within each group (6 matches per group)
- **Knockouts:** QF1 (G1 2nd vs G2 3rd), QF2 (G2 2nd vs G1 3rd) → SF1, SF2 → Final

### Auction Rules
- Squad: captain + 4 bid players = 5 total
- 3 player groups: A=200pts, B=100pts, C=50pts base
- Bid increment: 50pts

### Captains (Season 1)
| Name | Group | Wallet |
|------|-------|--------|
| Abhay | B | 1,050 pts |
| Vedant | B | 1,050 pts |
| Nayen | B | 1,050 pts |
| Soham M | A | 900 pts |
| Aashay | A | 900 pts |
| Aryan | C | 1,200 pts |
| Tushar | C | 1,200 pts |
| Swapnil | C | 1,200 pts |

---

## File Structure

```
/
├── index.html              # Login page
├── admin.html              # Admin panel shell (loads js/admin/ modules)
├── captain.html            # Captain view
├── board.html              # Public live board
├── style.css               # Global dark theme
├── auth.js                 # Login logic
├── budget-warning.js       # Budget warning calculator (Season 2)
├── standings.js            # Standings, schedule, bracket HTML generators
├── supabase-config.js      # Supabase client (const db = ...)
├── manifest.json           # PWA manifest
├── css/
│   └── admin.css           # Admin-only styles
└── js/
    └── admin/
        ├── state.js        # Global state, switchTab, logout
        ├── data.js         # loadData() — fetches all tables, calls all renders
        ├── auction.js      # Bidding control, sale confirmation, undo
        ├── overview.js     # Captain cards + roster display
        ├── players.js      # Player pool, dropdowns, manual assign
        ├── matches.js      # Fixtures, result entry, scorers, MVP, bracket
        ├── stats_schedule.js # Standings, stats, schedule, bracket renders
        ├── payments.js     # Game dues tracking
        ├── halloffame.js   # Hall of Fame archive
        ├── realtime.js     # Supabase realtime subscriptions (debounced)
        └── init.js         # Boot: calls loadData()
```

---

## Deploy

1. Push to `main` branch on GitHub
2. GitHub Pages serves from root — live at https://www.bpldallas.team
3. Custom domain configured via `CNAME` file + Namecheap DNS
4. HTTPS provisioned automatically by GitHub Pages
