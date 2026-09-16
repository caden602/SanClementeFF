# The Apology Tape

A no-login fantasy football apology-video wall. Vercel hosts the frontend while videos upload directly to a Hostinger server, where FFmpeg converts phone recordings to browser-friendly MP4/H.264.

## Run locally

```bash
npm install
npm run dev
```

The production upload endpoint defaults to `https://videos.2-24-124-55.sslip.io`.

## Deploy to Vercel

1. Push this folder to GitHub and import the repository at Vercel, or run `vercel` from this directory.
2. Deploy the included `server/` service and Nginx configuration to the video host.
3. Share the production URL with the league.

Uploads are intentionally public and require no sign-in. The server only accepts requests from the production website in normal browsers and applies IP-based rate and connection limits. Videos are limited to 10 minutes and 750 MB.

The site also emits `noindex` metadata and a crawler-blocking `robots.txt` so the league archive is not intended to appear in search results. This reduces casual discovery but is not authentication and does not make the videos private.

## Video compatibility

The app accepts common iPhone and Android containers including MP4, MOV, M4V, WebM, 3GP, MPEG, and AVI. Files are stored as-is. Browser playback still depends on the codec inside the file; MP4/H.264 is the most universally playable format.
