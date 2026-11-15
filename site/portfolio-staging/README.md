# Portfolio curation v3 – draft only

This is a staging plan for the user's 84 curated portfolio items. It is **not** read by the live website. The public website still uses `site/projects.v28.json`, and `main` remains untouched.

## Counts
- 84 total: 67 Keep, 13 Remove, 4 Review
- Cinema 01: 65 Keep, 1 Review, 2 Remove
- Cinema 02: 2 Keep, 1 Review
- Unassigned: 2 Review, 11 Remove
- 50 existing GitHub projects, 6 new folders, 26 earlier projects, 2 grouped collections

## Navigation requirement
The current website treats every 48-seat block as a new cinema. That cannot represent the user's desired Cinema 01/Cinema 02 split: Cinema 01 alone has 65 kept projects. Implement a top-level cinema selection and paginate inside Cinema 01. Do not allow automatic overflow into Cinema 02.

## Media handling
- L'Oréal: Vimeo 1246944281
- Merry Pearl Pitching: Vimeo 1092679092 as first asset and first Cinema 02 project (still marked Review)
- Mercedes-Benz BAM Festival: Vimeo 1089511226 and 1089511251; audit existing local files before removing anything
- Graphics: matched designs added after the original photo/video sequence; unmatched designs grouped as `Graphics – Independent Work` in Cinema 02
- agnès b. in-house website: six screenshots shown as a **single** Cinema 02 project
- Older "Charging station_01" should be appended to the existing Mercedes-Benz Charging Stations project rather than a new project

## Safety
Never delete original files or video binaries, move items in Google Drive, force-push, publish, or deploy without the user's specific approval. Do not accidentally place unapproved private Google Drive URLs in this public repository. Vimeo URLs need embed verification. Data is staged, not live.

See `curation-v3.json` for the authoritative user-selected ordering and statuses.
