# EDGE Live Capture — iOS Shortcut (fallback if Safari CORS is blocked)

This is the fallback for when `loterias-ai/mobile/edge-live-watch/` (the Safari
PWA) cannot make a direct cross-origin `POST` to Botemania's GraphQL endpoint
because of CORS. The Shortcuts app is native, so it is **not** subject to
browser CORS restrictions — it can `POST` to any URL directly.

Everything here uses only the built-in **Shortcuts** app that ships with iOS.
No Mac, no paid app, no GitHub Actions.

All exact values (URL, headers, body, thresholds) live in
[`ios-shortcut-request-spec-v1.json`](./ios-shortcut-request-spec-v1.json) in
this same folder — build the Shortcut from that file, not from memory. If
anything below seems to disagree with the spec JSON, the spec JSON wins.

## What you're building

A Shortcut that, each time you run it:
1. Fetches the live jackpot feed.
2. Compares it against the last saved snapshot.
3. Detects a reset (≥20% drop on any tracked counter).
4. Saves the new snapshot, and — only on a reset — a separate evidence file.

You run it manually (or via the Shortcuts app's own repeat/automation
options — see **Repeating it** below). It does **not** run forever in the
background on its own; iOS does not allow that for a plain Shortcut.

## Step-by-step build (Shortcuts app, iPhone)

Open the **Shortcuts** app → **+** (new shortcut) → name it `EDGE Live Capture`.

**1. Get Contents of URL**
- URL: `https://www.botemania.es/es/graphql`
- Method: `POST`
- Headers (tap "Add new field" for each):
  - `Content-Type` → `application/json`
  - `Accept` → `application/json`
  - `venture` → `botemania_es`
  - `Origin` → `https://www.botemania.es`
  - `Referer` → `https://www.botemania.es/`
  - `Cache-Control` → `no-cache, no-store, max-age=0`
- Request Body: `JSON`, and paste this exact body (from the spec file's
  `request.body`):
  ```json
  {
    "operationName": "loadJackpots",
    "variables": {},
    "query": "query loadJackpots {\n  jackpots { id amount }\n  redTigerJackpots { id amount }\n  blueprintJackpots { id amount }\n}"
  }
  ```

**2. Get Dictionary from Input** (feeds from the previous action's result)

**3. Get Dictionary Value** for key `data`, then again for keys `jackpots`,
`redTigerJackpots`, `blueprintJackpots` (three separate small chains, one per
network) — each gives you a list of `{id, amount}` dictionaries.

**4. Repeat with Each** over each of those three lists:
- Inside the repeat, `Get Dictionary Value` for `id` and `amount` from
  "Repeat Item".
- `Combine Text` to build the identity key: `<network>:<id>` — use the fixed
  label for that list (`generic` for `jackpots`, `redTiger` for
  `redTigerJackpots`, `blueprint` for `blueprintJackpots`), matching
  `networkLabelMapping` in the spec file exactly.
- `Get Dictionary Value` from a `Rolling Snapshot` dictionary (loaded in step
  5 below) for that same identity key, to get the **previous** amount.
- `If` `previousAmount` has a value **and** `previousAmount > 0` **and**
  `currentAmount < previousAmount`:
  - `Calculate` `dropFraction = 1 - (currentAmount / previousAmount)`
  - `If` `dropFraction ≥ 0.2`:
    - This is a reset. Build the evidence dictionary using
      `evidenceBundleShape` from the spec file (`detectedAt`, `counter`,
      `previousAmountEUR`, `currentAmountEUR`, `source: "IOS_SHORTCUT_NATIVE"`,
      `queryVersion: "loadJackpots-v1"`).
    - `Save File` to
      `iCloud Drive/Shortcuts/EdgeLiveCapture/edge-live-reset-<counter>-<timestamp>.json`
      (use `Combine Text` to build that filename, sanitizing `:` out of the
      counter name — colons aren't valid in filenames).
- Update a working dictionary (`Set Dictionary Value`) with this identity
  key's current amount, to become part of the new rolling snapshot.

**5. Before step 3**, load the existing rolling snapshot at the very start of
the Shortcut:
- `Get File` `iCloud Drive/Shortcuts/EdgeLiveCapture/edge-live-snapshot.json`
  (use "Get File" with "Error if Not Found" **off**, since the very first run
  won't have one yet).
- `If` the file exists, `Get Dictionary from Input` on it → this is your
  `Rolling Snapshot` dictionary used in step 4. If it doesn't exist, use an
  empty dictionary instead (first run just establishes the baseline; it can
  never itself be a reset).

**6. After the repeat loops finish**, `Save File` the updated working
dictionary as the new
`iCloud Drive/Shortcuts/EdgeLiveCapture/edge-live-snapshot.json`, overwriting
the previous one (`Save File` → toggle "Overwrite If File Exists" **ON**).

**7. Optional but recommended:** end with a `Show Notification` summarizing
how many counters were sampled and whether any reset fired, so a manual run
gives you instant feedback.

## Repeating it

Shortcuts on iOS can't run indefinitely in the true background like a server
process. Two realistic options, both native, no paid app:

- **Manual**: run it yourself every so often (Shortcuts app, or add it to
  your Home Screen / Action Button for a one-tap run).
- **Personal Automation**: Shortcuts app → **Automation** tab → **+** → "Time
  of Day" repeating automation, or a "When I open an app" trigger. iOS may
  still ask for confirmation before running non-trivial automations
  unattended (by design, for your safety) — this is expected, not a bug in
  the Shortcut.

Either way, this gives coarser sampling than the 30–60s PWA polling. That's
fine — it's the fallback path, not the primary one. The `preWindow` /
`postWindow` fields in the evidence bundle are best-effort: only as dense as
however often you actually ran the Shortcut around the event.

## Verifying it works before trusting it

1. Run it once. Confirm `edge-live-snapshot.json` was created in
   `iCloud Drive/Shortcuts/EdgeLiveCapture/` and contains real amounts for
   the `priorityCounters` listed in the spec file.
2. Run it again a few minutes later. Confirm no false reset fired (amounts
   should be flat or growing, not dropping ≥20%) — this validates the
   comparison logic isn't miscounting.
3. Only after both of those look correct should you rely on it to catch a
   real reset.

## What this Shortcut must never do

Per `guards` in the spec file: no login, no game launch, no betting, no
automatic `realMoneyAllowed`/`economicPromotionAllowed` — this Shortcut only
ever produces **evidence files** for later, separate, human/EDGE review. It
never decides `PLAY_NOW` on its own.
