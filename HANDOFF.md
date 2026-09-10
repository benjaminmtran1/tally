# Tally — session handoff

*Written 2026-09-09. Read this, then `README.md`.*

## State

v1 is built and passes its checks: catalog + manual entry + totals, the yield /
cut-list panel, and the recipe engine. Deferred by design: cross-vendor
comparison, 2D sheet nesting, the SetDraft/DraftSmith import, a persistent offcut
rack.

## The one thing to understand

**Everything hangs off `inferStock()`.** Nesting and recipes both need to know what
a catalogue row physically *is*, and that is only ever a guess off a description
string. Which is why:

- the import never commits without showing its guesses back (`openReview`), and
- re-importing a newer price list **matches on `code` and updates `price` only**,
  preserving hand-corrected `stock`, `wastePct` and `classOverride`.

Break that second rule and every correction Ben has made is thrown away. It lives
in `commitImport()`, in the `mode === 'update'` branch.

## Verified against the real document

`~/Desktop/lumber.pdf` — Mar-Lyn Lumber Sales Limited, quote 12438, 2025-03-26,
"REGULAR PRICING".

| | |
|---|---|
| Pages with text | 4 |
| Priced rows read | 149 |
| Repeated SKUs collapsed | 5 (`MDF1/248 MDF1/448 MDF3/448 MDF3/848 MDF5/848` — printed on pages 1 *and* 3) |
| Unique catalogue items | **144** |
| Rows as printed | **$13,664.27** — equals the document's own subtotal, so every price read correctly |
| HST on the document | $1,776.34 at H = 13% |
| Inferred | 50 linear · 75 sheet · 19 by the unit |
| Needing a hand fix | 18 of 144 (12.5%) |

Those 18 are genuine ambiguities, not parser failures: thirteen are stock sold by
the lineal foot in random lengths (`2x4 #1 Pine`, `1x12 Rough Pine`…) where the
document simply never states a length, four are Snake Ply rows that omit the sheet
size, and one is `Collection Pine Panel`. If that count climbs much past ~20 of
144 after a heuristics change, the change is wrong.

**Do not trust "158 items"** if you see it anywhere — that was an early eyeball
estimate and it was wrong.

## Checks

`index.html?test` runs 64 assertions covering the unit parser and formatter, the
expression evaluator, stock inference, `panelsPerSheet`, the 1D nester (including
that offcut reuse actually lowers the stick count) and the 2D nester (pieces stay
inside the sheet, never overlap each other or an offcut, rotation obeys the grain
lock, and kerf costs the fourth exact quarter of a sheet). The same panel takes a PDF and
reports what it found so you can hold the document next to the screen. Nothing is
imported by that check.

The arithmetic worth re-checking by hand after any change to the nester —
Hollywood Flat ×8 at 4'0 × 10'0, toggles @ 24", 1×3 frame, ¼ lauan:

```
stiles   max(2, ceil(4/2)+1) = 3  ×8 = 24 @ 9'-10½"   237.0 lf
rails    2                        ×8 = 16 @ 4'-0"      64.0 lf
toggles  ceil(10/2) - 1 = 4       ×8 = 32 @ 3'-10½"   124.0 lf
                                              total   425.0 lf
nested   24×14' + 6×16' = 30 sticks, 432 lf, 98% nest yield
+10%     33 sticks, 480 lf, 89% yield overall
skin     8 panels 4×10 -> 1 per 4x10 sheet -> +10% -> 9 sheets
```

## Sheet nesting

`nest2D()` is **shelf packing (first-fit decreasing height), deliberately not
MAXRECTS.** Shelf packing produces strictly guillotine cuts — strips across the
sheet, then crosscuts within a strip — which is how a panel saw works. It costs
a few percent of yield and buys a layout a shop can actually follow. Don't
"improve" it into a rectangle packer without deciding that tradeoff again.

For a class with several sheet sizes, every size is nested and the cheapest one
that holds the panels wins, so a 4′×10′ skin buys a 4×10.

## Traps

- **`DecompressionStream` refuses trailing junk**, unlike zlib. A PDF stream body
  usually carries an EOL before `endstream`, so `inflateBytes()` trims it and
  `parseVendorPDF()` prefers the dictionary's `/Length`. Undo either and every PDF
  reads as "probably a scan".
- **The PDF text walk never resets on `BT`.** It accumulates `Td` offsets across
  the whole stream, which is what makes Mar-Lyn's rows bucket correctly by Y. It
  looks wrong and it is deliberate.
- **A waste override of `0` is a real choice.** Group waste seeds from the first
  contributing line, not from `0`, or "no waste" silently reads as "job default".
- **Recipe `qty` is per unit.** The engine multiplies by the run count; don't write
  `2 * qty` in a part.
- **The static id-check reports `par_`, `bind_`, `cmpA`, `cmpB` as missing.** They
  are built by string concatenation. False positive.
- **Kerf decides sheet counts, and it looks like a bug when it does.** Five 4′×4′
  decks take five 4×8 sheets, not three, because two 48″ pieces need 96⅛″ of a
  96″ sheet. That is correct and it will not look correct. `computeJob` re-nests
  at kerf 0 and raises `g.kerfCost` with a flag saying what cutting a kerf under
  would save. Keep that flag — without it the number reads as broken.
- **The service worker must revalidate in `fetch`, not `install`.** `sw.js` is
  usually byte-identical between deploys, so the browser never reinstalls it —
  a plain cache-first shell with a "bump the CACHE constant" rule pins every
  returning visitor to the first version they ever loaded, and the bump gets
  forgotten. It is stale-while-revalidate now: serve from cache, compare the
  fetched shell, and `postMessage` the page when it genuinely differs. The page
  offers a reload; it never swaps the app out under someone mid-estimate.
- **A job bundle reuses a local catalogue on an id match only.** Matching on
  vendor + date instead would attach the job's lines to a catalogue whose item
  ids differ, silently breaking every line. Duplicating a catalogue is the safe
  failure.

## Where things are

Single file, sectioned in order: `UNITS · STORE · PDF · INFER · CLASSES · NEST ·
MATH · RECIPES · UI · MODALS · EVENTS · TESTS · INIT`. Grep the banner comments.

Shared kit with SetDraft: the CSS custom properties are copied verbatim, the
two-tier storage mirrors its pattern, and `cutListCSV()` emits SetDraft's
`exportCutListCSV()` column order on purpose — that is the seam for importing a
drawing's cut list later.

## Next

1. Cross-vendor comparison. `classKeyOf()` is keyed `(vendor, nominal, species)`;
   widen it to a shared material id with a confirm-by-click match table. Needs a
   second price list to be worth building.
2. SetDraft bridge: read `Element,Material,Piece,Qty,Length,Width,Notes` into
   recipe-shaped lines. Read-only file boundary, no coupling.
3. 2D sheet nesting with layout diagrams.
4. An offcut rack that persists between jobs.
