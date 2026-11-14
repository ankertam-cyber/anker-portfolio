# Anker Tam — Portfolio

Ideas take the stage.

A personal Creative Director portfolio built around a cinema, with a shared seat-to-screen camera, project galleries, films, and a box office contact section.

GitHub Actions checks the site and publishes it to GitHub Pages. In Settings → Pages, select **GitHub Actions** as the source.

Project content and display order live in `site/projects.json`. Entries marked `draft` stay unpublished. The first two selected projects are BAM Festival and the 2024 Maybach EQS SUV.

Website-ready images and approved artwork are stored in checksummed `media-seeds` packages. Actions extracts them and verifies their contents before publication. Film sources are verified against `media-sources.json` and backed up to the repository's versioned media release. Visitors play the films directly on the portfolio website.

Full-resolution original media is archived separately. Font licences are included with the website assets.
