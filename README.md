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
- **Nesting in both dimensions.** Sticks pack into real stock lengths with kerf
  and offcut reuse. Sheets get an actual layout — which panel falls where, drawn
  to scale, with the offcuts marked and the rackable ones highlighted. Panels
  rotate unless you lock the grain, and the nester picks the cheapest sheet size
  that can hold them, so a 4′×10′ skin buys a 4×10 rather than pretending two
  4×8s cover it.
- **Kerf is a dial, because it decides more than it should.** Two 4′0″ pieces need
  96⅛″ of a 96″ sheet, so an eighth of an inch can double a sheet count. When
  that happens the app says so and tells you what cutting a kerf under would
  save, instead of quietly charging you for the extra sheets.
- **Both waste dials** — a job-wide percentage with per-material and per-line
  overrides. The mark beside each figure says which one won.
- **Named jobs and snapshots**, so you can freeze the numbers, change an
  assumption, and compare.
- **Jobs export and import as a single file.** Each origin keeps its own
  IndexedDB, so a bundle carries the job *and* the catalogue it prices against
  — a job alone means nothing on another machine.

## What it does not do

- **Sheet layouts are guillotine strips, not optimal packing.** Shelf packing
  gives up a few percent of yield to stay something a panel saw can follow: rip
  the sheet into strips, then crosscut within each strip. A bulk square-footage
  entry is still just area, and says `area est`.
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
