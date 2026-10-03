# ninefive frontend

The web app for Moldova Tender Copilot: a company profile, a board of tenders in five stages,
tender details with citations, a competitor analyzer and integrity signals.

The frontend is built first, against a mock API. The backend will then be built to match it,
so **`src/api/types.ts` is the API contract**.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The mock API is on by default, so no backend is needed.

## Mock API and the real backend

- [MSW](https://mswjs.io) intercepts requests to `VITE_API_BASE_URL` (default
  `http://localhost:8000`) in the browser and in tests, and answers from `src/mocks/data`.
- Changes you make in the app, like moving a card, last until you reload the page.
- Document and citation links open a placeholder page, `public/mock-document.html`.
- All companies, buyers and IDNOs in the mock data are fictional.
- To use the real backend, create `frontend/.env.local` with `VITE_API_MOCKS=false`
  (see `.env.example`).
- If the app calls a backend URL that has no mock, the browser console shows a warning.
- The browser can put the mock service worker to sleep in a background tab. When a request then
  can't reach the server, the app switches the mocks back on and repeats it once
  (`setNetworkErrorRecovery` in `src/api/client.ts`).

## Checks

```bash
npm run check      # types, lint, formatting and tests: run before every merge
npm run format     # fixes formatting
npm run test:watch # tests while you work
```

## Demo

- `DEMO.md` is the 3-minute demo script.
- `npm run demo:record` records it as a video with captions, using its own dev server and the
  mock data: `demo-recording/ninefive-demo.webm` (not committed). It needs Playwright's Chromium
  (`npx playwright install chromium` once).

## Who owns what

| Area                                | Folder                   | Person |
| ----------------------------------- | ------------------------ | ------ |
| Setup, contract, company profile    | `src/features/profile`   | 1      |
| Tender board                        | `src/features/board`     | 2      |
| Tender detail page                  | `src/features/tender`    | 3      |
| Competitor analyzer                 | `src/features/analyzer`  | 4      |
| Integrity signals, buyer page, demo | `src/features/integrity` | 5      |

Each area also has its own translation file (`src/i18n/locales/<language>/<area>.json`), its
own API module (`src/api/<area>.ts`) and its own mock handlers (`src/mocks/handlers/<area>.ts`),
so people rarely edit the same file.

Shared pieces, in `src/components/shared`:

- `PageHeader`: breadcrumbs, title, description and actions of a page; renders into the top bar
- `Panel`, `PanelHeader`, `PanelBody`: the white card every section sits in
- `StatCard`: KPI card with an icon tile, label and big number
- `Table`, `Th`, `Tr`, `Td`: data tables in the panel style
- `SegmentedNav`: tabs with a sliding green pill
- `QueryState`: loading, error and "not found" states for any query
- `CitedText`, `CitationLink`: AI claims with links to the document page
- `DisclaimerBanner`: required next to eligibility and win chance
- `StageBadge`, `TagChips`, `UpdatedAgo`
- `EmptyState`, `ErrorState`, `NotFoundState`, `InProgress`

Helpers live in `src/lib`: money, dates and "5 minutes ago" (`format.ts`), eligibility percent
(`eligibility.ts`), IDNO check (`idno.ts`).

## Design

The look follows the QGroup Analytics platform: forest-green sidebar, lime active state, Manrope,
soft panels on a pale green-gray ground.

- **Tokens.** Colors, shadows and radii are CSS variables in `src/index.css`, with a light and a
  dark set. Use the Tailwind names (`bg-card`, `text-muted-foreground`, `bg-surface-2`,
  `shadow-panel`, `rounded-2xl`, `text-ink-2`, `bg-good-soft`...), never raw hex values, or dark
  mode breaks.
- **Dark mode.** `src/theme/theme.ts` sets `data-theme` on `<html>`. `dark:` classes work, but
  tokens usually make them unnecessary. The theme follows the system until the user picks one.
- **Motion.** Pages fade in (`animate-page-in`), panels and KPI cards rise in (`animate-panel-in`,
  put them in a `stagger` grid to cascade), popovers use `animate-pop-in`. The theme switch grows
  as a circle from the click. Reduced-motion settings turn all of it off.
- **Layout.** Each page renders a `PageHeader`, then a `stagger` grid of `StatCard`s if it has
  key numbers, then `Panel`s.

## Rules

1. **The contract.** Any change to `src/api/types.ts` needs the matching mock data and handler
   change, and the backend person should hear about it. Field names stay `snake_case` and match
   `backend/app/schemas.py` where the two overlap.
2. **New endpoint:** add the type to `types.ts`, a fetch function and hook to `src/api/<area>.ts`,
   a handler to `src/mocks/handlers/<area>.ts` and data to `src/mocks/data`.
3. **No hard-coded text.** Add every string to your area's file in `ro`, `en` and `ru`. A test
   fails if a language is missing a key. Romanian is the default.
4. **Citations.** Show AI claims with `CitedText` or `CitationLink`. A claim without a citation
   is not shown.
5. **Integrity signals.** Never say or imply that a buyer or company is corrupt. Use neutral
   wording, show the evidence and let the user judge.
6. **Disclaimers.** Put `DisclaimerBanner` next to eligibility results (`legal`) and win chance
   (`winChance`).
7. **Colors.** The `stage-*` and `signal` colors are only for stages and integrity signals. Check
   every screen in both themes.
8. **Folder names.** The root `.gitignore` ignores folders named `models`, `build` and `dist`,
   so don't use those names in `src`.
9. **Git.** Use one branch per person, keep commits small and merge to `main` often.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4 and shadcn/ui (`src/components/ui`, generated: add
components with `npx shadcn@latest add <name>`), TanStack Query, React Router, i18next, MSW,
Vitest and Testing Library. Font: Manrope, bundled locally, with Romanian and Cyrillic characters.
