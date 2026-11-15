# Anker Tam — Portfolio

Ideas take the stage.

A personal Creative Director portfolio with a shared cinema camera, curated project galleries, native and embedded video players and a box office contact section.

GitHub Actions validates the website and publishes it to GitHub Pages. Source: GitHub Actions in Settings > Pages.

Project content and display order live in site/projects.json. BAM Festival, the 2024 Maybach EQS SUV and C-Class Launch are featured first. Other projects follow recorded event dates; Experience Day editions stay adjacent from newest to oldest. Unknown dates are never invented.

Responsive photos, approved artwork and font licences are stored in checksummed media-seeds packages. The build validates actual image dimensions before publication. Native MP4 movies are backed up to this repository’s portfolio-media-v1 release. Vimeo films load through the official player only when opened; closing or changing the item tears down the iframe and stops its audio. Playback remains subject to the source owner’s Vimeo availability and embed settings. Visitors stay inside the portfolio.

Original masters and the private asset audit remain separate from the public website.

## Owner back office

Open `https://ankertam-cyber.github.io/anker-portfolio/admin/` to edit project names, descriptions, case studies, visibility, project order, media order and profile/contact copy. Drafts autosave in the current browser; download a JSON backup before changing devices. The editor supports adding public HTTPS images, MP4/WebM direct links and Vimeo links. It does not upload local media files.

Use **預覽草稿** to see the actual site with an unpublished badge. **檢查並發佈** shows a change summary; **確認發佈到正式網站** commits `site/content.json` to `main`, then tracks the existing Pages workflow and checks the deployed content revision. A submission is not reported as live until deployment succeeds. Original project/media records remain intact beneath the owner overrides.

For publishing, create a fine-grained GitHub token restricted to `ankertam-cyber/anker-portfolio`, with **Contents: Read and write** and **Actions: Read-only**. Paste it only into the back office connection dialog. It is held in tab memory, never persisted, included in backups, or sent anywhere except the GitHub API. Reconnect after a reload. Follow [GitHub's token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

The editor is a static client; viewing its public URL grants no publication rights. Publishing checks the content SHA and refuses to overwrite a newer GitHub update. Imported content is validated by the editor, public runtime and CI. Keep the approved V29.1 visual layout and automatic tagline sparkle when extending the editor.

Owner-approved exclusions, merged project identities, confirmed years and photo priorities are enforced by site/portfolio-curation.json and the publication checks. Existing IWC and charging-station links resolve to their merged posts. Instagram films are archived as native MP4s; no Instagram runtime player is required.
