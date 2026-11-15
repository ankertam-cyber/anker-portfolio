# Portfolio curation v4 – draft only

This is a staging plan for the user's 84 curated portfolio items. It is **not** read by the live website. The public website still uses `site/projects.v28.json`, and `main` remains untouched.

## Counts
- 84 total: 65 Keep, 13 Remove, 6 Review
- Cinema 01: 60 Keep, 2 Review, 2 Remove
- Cinema 02: 5 Keep, 2 Review
- Unassigned: 2 Review, 11 Remove
- 50 existing GitHub projects, 6 new folders, 26 earlier projects, 2 grouped collections

## Navigation requirement
The current website treats every 48-seat block as a new cinema. That cannot represent the user's desired Cinema 01/Cinema 02 split: Cinema 01 alone has 60 kept projects. Implement a top-level cinema selection and paginate inside Cinema 01. Do not allow automatic overflow into Cinema 02.

## Media handling
- L'Oréal: Vimeo 1246944281
- Merry Pearl Pitching: Vimeo 1092679092 as first asset within its project, now project #5 of Cinema 02 (still Review)
- Mercedes-Benz BAM Festival: Vimeo 1089511226 and 1089511251; audit existing local files before removing anything
- Graphics: matched designs added after the original photo/video sequence; unmatched designs grouped as `Graphics – Independent Work` in Cinema 02
- agnès b. in-house website: six screenshots shown as a **single** Cinema 02 project
- Older "Charging station_01" should be appended to the existing Mercedes-Benz Charging Stations project rather than a new project

## Safety
Never delete original files or video binaries, move items in Google Drive, force-push, publish, or deploy without the user's specific approval. Do not accidentally place unapproved private Google Drive URLs in this public repository. Vimeo URLs need embed verification. Data is staged, not live.

See `curation-v4.json` for the latest user-selected ordering and statuses; `curation-v3.json` is retained for version history.

## Desk bell audio request
The staging branch source `site/app.mjs` now synthesizes a short bell chime using the Web Audio API on a direct button click, while preserving the existing ringing animation. This is a source-only change until the browser bundle is rebuilt and tested. Test on iPhone Safari / Chrome, desktop browsers, reduced-motion setting, and after repeated taps; do not claim the live website has sound before deployment approval.

## Reconfirmed Cinema 02 order (v4)
1. Mercedes-Benz - CLA Car City Promotion — Review
2. HOFEX - Le Cordon Bleu — Keep
3. Eco Expo Asia – HK Pavilion — Keep
4. Mercedes-Benz – GLB Launch — Keep
5. Merry Pearl Dreamland (Oyster BB) Pitching — Review
6. Graphics – Independent Work — Keep
7. agnès b. – In-house Website Design — Keep

Cinema 02 ordering remains editable in the conversation before publication.
