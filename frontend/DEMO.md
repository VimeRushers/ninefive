# Demo script

About 3 minutes. It runs on the mock data (`npm run dev`), so it works without the backend or
internet. The steps match the fallback video.

**Before you start**

- Open `http://localhost:5173/board?view=board` in a fresh window at 1440×900 or larger, in light
  theme and Romanian.
- To start from clean data, reload the page; the mock data resets on every reload.
- Fallback: `npm run demo:record` makes `demo-recording/ninefive-demo.webm` (about 70 s, with
  captions). Record it before the event and keep it on the laptop.

## 1. The board (30 s)

_"Every Moldovan public tender that fits the company's profile, sorted into stages. MTender is
checked every 30 minutes."_

- Point at the KPI row: how many tenders are in each stage and what they're worth.
- Scroll the columns sideways with the round arrow.
- Point at a card: value, deadline, eligibility, win chance, tags, and the "Actualizat" badge on
  a tender that changed in the last sync.

## 2. Search finds Russian tenders (20 s)

_"Search works across Romanian and Russian. A keyword search on the official platforms would
miss this one."_

- Type `calculatoare` in the search bar. The Russian tender "Поставка компьютерной техники…"
  appears.
- Clear the search.

## 3. Filters (20 s)

- Open **Eligibilitate**, then click **100 %**. _"Only tenders the company fully qualifies for."_
- Click **Resetează filtrele**.

## 4. The gray zone (25 s)

_"Sometimes the AI can't tell whether the company has what the tender asks for. Here it asks for
color A3 printers, and the catalogue only has a black-and-white A4 one. It says so and lets you
decide."_

- On "Achiziționarea imprimantelor multifuncționale color A3" in **Discutabil**, click **Avem**.
  The card moves to **Nou**.
- Optional: drag any card to another column, or use its **⋯** menu.

## 5. One tender in depth (35 s)

Open **"Achiziționarea calculatoarelor și monitoarelor pentru aparatul administrativ"**.

_"Everything the AI says links to the document and page it came from."_

- **Verificarea eligibilității:** 4 of 6 met, 1 not found in the documents, each with its page.
  Click a page link to show the citation opening.
- **Șansa de câștig:** estimated only from past tenders, as the note says.
- **Potrivirea produselor:** what the tender asks for next to the company's closest products and
  prices.

## 6. Integrity signals (25 s)

Open the **Semnale de integritate** tab.

_"Five patterns worth a closer look: a 6-day submission window, a brand named without 'or
equivalent', one supplier winning 7 of the last 9 contracts. These are signals with evidence,
not accusations. The user decides."_

- Point at the evidence links, then **Vezi istoricul cumpărătorului**.

## 7. Learning from competitors (25 s)

Back to the board, open **"Achiziționarea tablelor interactive și a proiectoarelor"** (Pierdut),
then the **Concurenți** tab.

_"We lost this one. The bid was the cheapest, but it was rejected for a missing 36-month warranty
certificate. Point 4.2, page 4 of the evaluation report. Next time, attach it."_

- Point at the rejection reason with its citation, then **Ce să faceți diferit**.

## 8. Finish (15 s)

- Switch to the dark theme (the moon icon), then **RU**, then back to **RO**.
- Open **Profilul companiei**. _"The company enters its IDNO; we pull the rest from data2b.md
  and read its catalogue from its price lists."_

## If something goes wrong

- **A screen shows "Datele nu s-au încărcat":** reload the page.
- **The board looks different after earlier clicks:** reload the page; the mock data starts
  fresh.
- **Anything else:** play the fallback video.
