# Onstrength

Salary planning tool for public sector managers.

Budget − base salary − estimates = where the year lands. Base salary is priced
exactly, by pay period, from the published classification tables. The estimates
are six whole-year judgement calls the manager makes: overtime, salary premiums,
acting pay, bilingual bonus, retention allowance, and everything else.

Everything runs in the browser. There is no server and no account. A manager's
roster lives in their own browser storage and never leaves their device — which
is the whole reason the link can be handed out freely.

---

## Getting it onto a phone

A phone can only install this once it has a real web address. Opening
`index.html` from a file works on a computer, but a phone needs a URL.

### The five-minute version — GitHub Pages

Free, permanent, and it is the same link you would post publicly.

1. Create a GitHub account if you have none.
2. New repository, **public**, named `onstrength` (or whatever the app ends up
   being called — the name shows in the URL).
3. Upload everything in this folder. Include the `icons` folder and the empty
   `.nojekyll` file — Pages needs that one or it will ignore the folders.
4. **Settings → Pages** → deploy from branch `main`, folder `/ (root)`.
5. Wait a minute. It is live at `https://YOUR-USERNAME.github.io/onstrength/`.

Then, on the phone:

- **iPhone** — open the URL in **Safari** (not Chrome), tap Share → **Add to
  Home Screen**.
- **Android** — open in Chrome, tap ⋮ → **Add to Home screen**, or take the
  install prompt when it appears.

It gets its own icon, opens full screen with no browser chrome, and works with
no signal.

> **A GitHub Pages site is public even when the repository is private.**
> Making the repo private hides the *code*; the published *site* stays on the
> open web. Access control for Pages exists only on GitHub Enterprise Cloud.
> There is no customer data in these files, so what is exposed is the idea and
> the work — but it is a decision, not a default.

### Just testing on your own phone, nothing published

From this folder on your computer:

```
python3 -m http.server 8000
```

Then visit `http://YOUR-COMPUTER-IP:8000` on your phone, on the same wifi.
Nothing leaves your network. Offline caching will not work — that needs HTTPS —
but everything else does.

### If you want a gate in front of it

**Cloudflare Pages + Cloudflare Access.** Drag this folder onto Pages, turn on
Zero Trust, and add an Access policy allowing only named email addresses,
authenticating by one-time PIN. Anyone else gets a login wall rather than the
app. The free tier covers 50 users; confirm the current limits before relying
on them. **Netlify** offers site-wide password protection on paid plans —
simpler, but one shared password rather than named people.

---

## Changing it later

Edit `index.html`, then **bump `CACHE_VERSION` in `sw.js`** — `onstrength-v1`
becomes `onstrength-v2`, and so on.

This matters. The service worker caches the app so it works offline, which also
means a browser that already has it will keep serving the old copy until the
version string changes. If you push an update and testers say nothing happened,
this is why.

---

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The whole app — markup, styles, the rate tables and the costing engine, in one file. |
| `manifest.webmanifest` | Name, icons and colours, so a phone treats it as an app. |
| `sw.js` | Caches the app for offline use. |
| `icons/` | Home screen and tab icons. |
| `gc-rates.json` | The rate dataset, kept beside the app for reference. The app does not fetch it — it is already inside `index.html`. |
| `.nojekyll` | Only needed for GitHub Pages. Harmless elsewhere. |

---

## How the forecast works

**Pay periods, not months.** A fiscal year is 26 periods of 14 days. Each
position costs `annual salary ÷ 26` per period, prorated by day when a start or
end date falls mid-period. This is how payroll actually posts, and it is why the
numbers hold up when someone starts on the 12th.

**Every position is sliced at its breakpoints.** A step increment, an FTE
change, a period of unpaid leave — each one cuts the year into spans, and each
span is priced at the rate and hours in force during it. Nothing is averaged.

**Four states cover the real cases.** Filled all year; vacant with an expected
start; leaving on a date; unpaid leave with a gap. Anything else is a
combination of those.

**Estimates are not calculated.** Overtime, premiums, acting pay, the bilingual
bonus, retention allowances and everything else are whole-year numbers the
manager types in. This is deliberate: precision should follow materiality.
Base salary is ~90% of the envelope and can be computed exactly, so it is.
The rest is judgement, and pretending otherwise would be false precision.

**Benefits and bonuses are not costed.** They are charged centrally in most
public sector organisations and never reach a cost centre manager's budget.

---

## Known limits

- **One browser, one roster.** Nothing syncs. Setup has a copy-out/paste-in box
  for moving a roster between devices, with names excluded by default.
- **The year is 364 days.** 26 × 14. It ends a day or two short of March 31 —
  right as a payroll year, slightly odd against a calendar.
- **Rate figures come from an aggregator**, not Treasury Board directly. Verify
  against the collective agreement before anyone relies on a number.
- **EX, DM, GC, GCQ, CEO, LC and PM-MCO are ranges**, not step grids. At-risk
  performance pay is not forecast.
- **No actuals.** This plans the year; it does not reconcile it. That is v2.

A planning tool, not a system of record. Check anything that matters against the
ledger.
