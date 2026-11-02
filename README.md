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

## Season 4 (Current) — Auction

- 7 teams, 7 playing captains (captains are not charged against the purse)
- Purse $60M per team, 5 auction players per captain, 6-player squads, 35 players in the auction
- Base price $5M, minimum raise $1M, no player groups
- **Max bid rule:** `max bid = remaining budget - (roster spots left after this purchase x $5M)`. Enforced when a sale is closed or assigned in Admin, and shown on the captain page and the board.
- **Draw order:** Admin uses **Draw Next Player**. Players never offered are drawn at random. A player who goes unsold (Close Bidding with no bids) goes to the back of the queue and returns only after every fresh player has been offered, oldest-unsold first.
- **Tournament format (Season 4):** 7 teams, 5v5, no goalkeepers, one field. Prelims: every team plays 4 games (14 total, 10 min). Seeds #1-#7 from standings; tiebreakers: Points (W3 D1 L0), GD, GF, Head-to-Head (only when exactly 2 teams are tied), then TGT (the shootout tiebreak the admin records). Playoffs: all 7 qualify, double elimination. Slot codes: W1A (#2v#7), W1B (#3v#6), W1C (#4v#5; #1 has a bye), W2A, W2B, WF, L1, L2A, L2B, L3, LF, GF, RF (reset final, only if the Losers Bracket champion wins the Grand Final). Minutes: prelims 10; W1/W2/L1/L2/L3 12; WF and LF 15; GF and RF 20. First playoff loss drops a team to the Losers Bracket, second eliminates. Losers ranking follows the pasted S4 rules (GD/GF in the game lost for new entrants, cumulative Losers Bracket GD/GF for existing teams, then seed).
- **Bracket engine:** `bracket.js` derives the whole bracket from match rows (round = slot code). Admin > Matches shows one button that generates every fixture whose two teams are known. If a played result is edited so a fixture no longer matches the bracket, it is flagged and generation is blocked until that fixture is deleted and regenerated. Playoff games cannot end level: enter the winning score.
- **Player photos (Live Board):** put one square headshot per player in `photos/`, named by the player's name in lowercase with dashes (`DJ` -> `photos/dj.jpg`, `Soham M` -> `photos/soham-m.jpg`). Shown on the Now Bidding card and the Just Sold banner; players without a file show their initials. To prepare photos: `python3 scripts/make_photos.py <folder_of_originals>` (named after each player, e.g. `Soham M.jpeg`) writes 400px jpgs into `photos/`. Check every crop before committing. To replace a photo that people may have cached, bump `PHOTO_VERSION` in `js/board/auction.js`.
- Run `S4_migration.sql` once in Supabase (adds `players.unsold_at`).
- Purses are stored in whole $M (`captains.wallet = 60`). `players.group_name` is a legacy column; new players are written with `'1'`.

---

## Season 2 — June 2026

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
├── standings.js            # Standings and schedule HTML generators
├── bracket.js              # S4 double-elimination bracket engine
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
