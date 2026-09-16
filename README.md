# The Apology Tape

A no-login fantasy football apology-video wall built for Vercel. Videos upload directly from the browser to Vercel Blob, avoiding the 4.5 MB Vercel Function request limit.

## Run locally

```bash
npm install
npm run dev
```

The site renders without storage configured; uploads and the real video gallery require a Blob store.

## Deploy to Vercel

1. Push this folder to GitHub and import the repository at Vercel, or run `vercel` from this directory.
2. In the Vercel project, open **Storage → Create Database → Blob** and connect the Blob store to this project.
3. Redeploy. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
4. Share the production URL with the league.

Uploads are intentionally public and require no sign-in. Anyone with the URL can request an upload token, so keep the link inside the league and configure Vercel spend alerts. Videos are limited in the UI to 10 minutes and 750 MB. The storage route only accepts common video MIME types.

The site also emits `noindex` metadata and a crawler-blocking `robots.txt` so the league archive is not intended to appear in search results. This reduces casual discovery but is not authentication and does not make the videos private.

## Video compatibility

The app accepts common iPhone and Android containers including MP4, MOV, M4V, WebM, 3GP, MPEG, and AVI. Files are stored as-is. Browser playback still depends on the codec inside the file; MP4/H.264 is the most universally playable format.
