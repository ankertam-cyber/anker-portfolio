# Anker Tam — Portfolio

Ideas take the stage.

A personal Creative Director portfolio with a shared cinema camera, curated project galleries, native and embedded video players and a box office contact section.

GitHub Actions validates the website and publishes it to GitHub Pages. Source: GitHub Actions in Settings > Pages.

Project content and display order live in site/projects.json. BAM Festival, the 2024 Maybach EQS SUV and C-Class Launch are featured first. Other projects follow recorded event dates; Experience Day editions stay adjacent from newest to oldest. Unknown dates are never invented.

Responsive photos, approved artwork and font licences are stored in checksummed media-seeds packages. The build validates actual image dimensions before publication. Native MP4 masters are backed up to this repository’s portfolio-media-v1 release. Browser playback uses separate, same-origin H.264/AAC MP4 copies with fast-start metadata, avoiding GitHub attachment redirects and binary download MIME types on iPhone. These copies have a maximum 1280-pixel edge and a mobile bandwidth limit; the masters remain unchanged. The editor and every public video player share the same playback resolver. Existing draft URLs and media identities remain intact. Vimeo films load through the official player only when opened; closing or changing the item tears down the iframe and stops its audio. Playback remains subject to the source owner’s Vimeo availability and embed settings. Visitors stay inside the portfolio.

The build requires FFmpeg. Browser copies are cached by source checksum and encoding policy; CI validates MP4 structure, H.264, fast-start ordering, complete film coverage and the existing Pages size budget before deployment. After publication, verify `video/mp4` and HTTP `206` byte-range delivery from Pages. Set `FFMPEG_PATH` for a local executable when it is not on PATH.

Original masters and the private asset audit remain separate from the public website.

## Owner back office

Open `https://ankertam-cyber.github.io/anker-portfolio/admin/` to edit project names, descriptions, case studies, visibility, project order, media order and profile/contact copy. Drafts autosave in the current browser; download a JSON backup before changing devices. The editor supports adding public HTTPS images, MP4/WebM direct links and Vimeo links. It does not upload local media files.

The editor loads as one versioned script bundle. Content requests have a 15-second deadline, including response bodies, and one automatic retry; startup failures offer reload and draft backup without clearing stored work. An unchanged older draft follows the latest published content automatically. Conflicting unpublished edits remain protected and show a version warning instead of a loading message. After a successful GitHub submission, editing resumes while deployment is tracked separately. Each new set of edits still needs explicit review and publication; the token remains in tab memory only.

Use **預覽草稿** to see the actual site with an unpublished badge. **檢查並發佈** shows a change summary; **確認發佈到正式網站** commits `site/content.json` to `main`, then tracks the existing Pages workflow and checks the deployed content revision. A submission is not reported as live until deployment succeeds. Original project/media records remain intact beneath the owner overrides.

For publishing, create a fine-grained GitHub token restricted to `ankertam-cyber/anker-portfolio`, with **Contents: Read and write** and **Actions: Read-only**. Paste it only into the back office connection dialog. It is held in tab memory, never persisted, included in backups, or sent anywhere except the GitHub API. Reconnect after a reload. Follow [GitHub's token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

The editor is a static client; viewing its public URL grants no publication rights. Publishing checks the content SHA and refuses to overwrite a newer GitHub update. Imported content is validated by the editor, public runtime and CI. Keep the approved V29.1 visual layout and automatic tagline sparkle when extending the editor.

### Batch media and library

**找重複相片** compares image contents in the current project or active library, regardless of filename. File/pixel-identical copies and visually similar candidates have separate results. The editor recommends retaining the largest-resolution copy; only identical-copy suggestions can be selected in bulk. Similar candidates always require individual selection and visual review. Each group retains at least one photo. The existing removal confirmation then controls project-only removal or the shared recycle area; nothing is published automatically and originals remain intact.

The local photo fingerprint index covers existing catalogue photos, so a phone does not need to download every original image to scan. New image links are compared in the browser when their source permits canvas access; unavailable images are counted explicitly. Scanning sends no photos to AI services. The conservative visual comparison can miss large crops, flips, and substantially changed viewpoints. Rebuild the index after replacing catalogue image files with `python scripts/build-image-fingerprints.py` (Pillow and NumPy); CI rejects stale fingerprints by source checksum.

When a confirmed shared-library cleanup is published from another device, the editor can merge that additive removal into an existing local draft while retaining its text, ordering, labels and unrelated library changes. Remote text edits, project edits, library restores and conflicting library record changes still require the existing stale-draft review.

Each native or Vimeo film has **預覽播放** in the project editor and shared library. The modal shows the clip label and filename, native timeline/fullscreen controls, and previous/next film buttons. Opening a preview attempts playback from that user action; browser restrictions retain a manual play control. Switching clips, closing the modal, or leaving the page stops playback; a hidden tab pauses it. Previewing does not edit the draft or select media.

Long-press a thumbnail or use its checkbox to select media. Shift-click selects a range. The media toolbar supports selecting all photos, selecting an entire project, moving a selection up/down, moving to the start/end of its category, or inserting the group at a numbered position. Selection order and the video/photo/design categories are preserved. Thumbnail and detail views share the same edits; each batch edit is one undo step.

Every removal asks for confirmation, shows the selected count and thumbnails, and offers project-only removal or removal to the shared library recycle area. Project-only removal retains reusable library records and affects only that project's references. Library removal hides every project use and poster/thumbnail reference, reports affected projects and can be restored from the library tab. It does not delete GitHub media packs, release videos or Drive originals; Git history and source archives remain intact. Publication review explicitly identifies library changes as retaining originals.

`content.library` is optional in the existing version-1 schema, so saved pre-library drafts remain supported. It stores reusable media records and the removed-source list; original catalogue records are preserved. The public runtime and CI apply the same library rules. Tests cover mixed-category batches, retained source order, shared cover references, restoration, import validation and long-press cancellation during scrolling.

Owner-approved exclusions, merged project identities, confirmed years and photo priorities are enforced by site/portfolio-curation.json and the publication checks. Existing IWC and charging-station links resolve to their merged posts. Instagram films are archived as native MP4s; no Instagram runtime player is required.
