# Tally

An estimating scratchpad for pricing a build against supplier price lists.
Single HTML file, no build step, no dependencies, no network.

**It is not a quote generator.** There is no client-facing document, no branding,
no PDF out. Manual entry is the spine; the recipe/flat calculator is a helper that
drops rows into the job.

## Run it

**Live: https://benjaminmtran1.github.io/tally/** — installs as a PWA and runs
with the network off, which is the version to put on a phone or a shop tablet.

Locally, open `index.html` in a browser. That's it — it works from `file://`.

For a stable origin (so storage survives and it installs as a PWA):

```
python3 -m http.server 8124
```

then `http://localhost:8124/index.html`. Add `?test` to run the self-checks.

Each origin keeps its own data — the Pages copy, `localhost:8124` and a
`file://` copy do not see each other's catalogs or jobs. Use **jobs → export**
and **jobs → import job** to move work between them.

## What it does

- **Catalogs, one per vendor, imported raw.** Drop in a supplier PDF, paste
  spreadsheet columns, or type rows. Nothing is normalised on the way in.
- **Stock inference.** Reads `1x3x16 #1 Pine · ft` as *a 16-foot stick of 1×3 sold
  by the lineal foot*, and `3/4 4x8 MDF · sht` as *a 4×8 sheet, ¾ thick*. It is a
  guess off a description string, so the import shows every guess back for
  confirmation before committing.
- **Classes.** Rows that are the same material in different stock sizes group
  together — the four `PIN11X3xx` rows become one *1x3 #1 Pine* offering 10/12/14/16.
  The nester chooses among them.
- **Recipes.** Parts are data: params in, cut pieces out, evaluated by a small
  parser (no `eval`). Ships with Hollywood Flat, Stud Wall and Platform.
- **1D nesting** with kerf and offcut reuse, so the buy list is what you actually
  put on the truck. Sheet goods are counted by *fit*, not just area: a 4′×10′ skin
  will pick a 4×10 sheet rather than pretend two 4×8s cover it.
- **Both waste dials** — a job-wide percentage with per-material and per-line
  overrides. The mark beside each figure says which one won.
- **Named jobs and snapshots**, so you can freeze the numbers, change an
  assumption, and compare.
- **Jobs export and import as a single file.** Each origin keeps its own
  IndexedDB, so a bundle carries the job *and* the catalogue it prices against
  — a job alone means nothing on another machine.

## What it does not do

- **No 2D sheet nesting.** Sheet counts are `ceil(qty ÷ panels-per-sheet)` with a
  fits / does-not-fit check, and the UI says `area est` where that's what it is.
- **No cross-vendor comparison yet.** Each vendor's list stands alone. The class
  key is built so it can widen later without a rewrite.
- **No import from SetDraft / DraftSmith yet.** The CSV export here already matches
  SetDraft's `exportCutListCSV()` column order, which is the intended seam.

## Storage

IndexedDB is the authority, with a `localStorage` hot slot as the crash survivor —
the same two-tier shape as SetDraft. Nothing leaves the browser.

## Keys

`/` add material · `R` run recipe · `S` snapshot · `N` new job · `U` flip units ·
`1`–`5` tabs · `Esc` close

## Dimensions

Type them the way you say them: `4'6 1/2`, `10'`, `24"`, `4.54`. A bare number is
feet. Display flips between fractional and decimal; storage is always decimal feet.
