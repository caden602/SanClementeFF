import { createServer } from "node:http";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";

const port = Number(process.env.PORT || 3001);
const storageRoot = process.env.STORAGE_ROOT || "/srv/sanclementeff";
const publicUrl = (process.env.PUBLIC_URL || "https://videos.2-24-124-55.sslip.io").replace(/\/$/, "");
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "https://sanclementeff.vercel.app,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const maxBytes = 750 * 1024 * 1024;
const maxDuration = 600.5;
const uploadDir = join(storageRoot, "uploads");
const videoDir = join(storageRoot, "videos");
const metadataDir = join(storageRoot, "metadata");
const logDir = join(storageRoot, "logs");

await Promise.all([uploadDir, videoDir, metadataDir, logDir].map((dir) => mkdir(dir, { recursive: true })));

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function setCors(request, response) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  return !origin || allowedOrigins.has(origin);
}

function cleanLabel(value, fallback, maxLength) {
  const cleaned = (value || "").trim().replace(/[<>\u0000-\u001f]/g, "").slice(0, maxLength);
  return cleaned || fallback;
}

function extensionFor(contentType, filename) {
  const byType = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-m4v": ".m4v",
    "video/3gpp": ".3gp",
    "video/3gpp2": ".3g2",
    "video/mpeg": ".mpeg",
    "video/x-msvideo": ".avi",
  };
  const candidate = extname(filename || "").toLowerCase();
  return byType[contentType] || (/^\.[a-z0-9]{2,5}$/.test(candidate) ? candidate : ".video");
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `${command} failed`))));
  });
}

async function readMetadata(id) {
  return JSON.parse(await readFile(join(metadataDir, `${id}.json`), "utf8"));
}

async function saveMetadata(metadata) {
  const path = join(metadataDir, `${metadata.id}.json`);
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(metadata, null, 2));
  await rename(temporary, path);
}

async function probeDuration(path) {
  const output = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path]);
  return Number(output);
}

function transcode(metadata, inputPath) {
  const outputPath = join(videoDir, `${metadata.id}.mp4`);
  const logPath = join(logDir, `${metadata.id}.log`);
  const args = [
    "-hide_banner", "-y", "-i", inputPath,
    "-map", "0:v:0", "-map", "0:a?",
    "-vf", "scale='min(1920,iw)':-2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ];

  const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"], detached: false });
  const log = createWriteStream(logPath, { flags: "a" });
  child.stderr.pipe(log);

  child.on("close", async (code) => {
    try {
      if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`);
      const details = await stat(outputPath);
      await saveMetadata({ ...metadata, status: "ready", size: details.size, url: `${publicUrl}/media/${metadata.id}.mp4` });
      await rm(inputPath, { force: true });
    } catch (error) {
      await saveMetadata({ ...metadata, status: "error", error: error instanceof Error ? error.message : "Processing failed" });
    } finally {
      log.end();
    }
  });
}

async function receiveUpload(request, response, url) {
  const contentType = (request.headers["content-type"] || "").split(";")[0].toLowerCase();
  if (!contentType.startsWith("video/")) return json(response, 415, { error: "Please choose a video file." });

  const declaredSize = Number(request.headers["content-length"] || 0);
  if (!declaredSize || declaredSize > maxBytes) return json(response, 413, { error: "Videos must be under 750 MB." });

  const id = randomUUID();
  const loser = cleanLabel(url.searchParams.get("loser"), "Anonymous Disaster", 50);
  const week = cleanLabel(url.searchParams.get("week"), "Unknown Week", 30);
  const filename = cleanLabel(url.searchParams.get("filename"), "upload", 120);
  const inputPath = join(uploadDir, `${id}${extensionFor(contentType, filename)}`);
  const output = createWriteStream(inputPath, { flags: "wx" });
  let received = 0;
  let tooLarge = false;

  await new Promise((resolve, reject) => {
    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        tooLarge = true;
        request.destroy();
      }
    });
    request.on("error", reject);
    output.on("error", reject);
    output.on("finish", resolve);
    request.pipe(output);
  }).catch(async (error) => {
    await rm(inputPath, { force: true });
    throw error;
  });

  if (tooLarge) {
    await rm(inputPath, { force: true });
    return json(response, 413, { error: "Videos must be under 750 MB." });
  }

  let duration;
  try {
    duration = await probeDuration(inputPath);
  } catch {
    await rm(inputPath, { force: true });
    return json(response, 415, { error: "That file does not appear to be a readable video." });
  }
  if (!Number.isFinite(duration) || duration > maxDuration) {
    await rm(inputPath, { force: true });
    return json(response, 422, { error: "This masterpiece is over 10 minutes. Trim the excuses and try again." });
  }

  const metadata = { id, loser, week, uploadedAt: new Date().toISOString(), duration, status: "processing", size: received };
  await saveMetadata(metadata);
  transcode(metadata, inputPath);
  return json(response, 202, { id, status: "processing" });
}

async function listVideos(response) {
  const files = (await readdir(metadataDir)).filter((file) => file.endsWith(".json"));
  const items = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(metadataDir, file), "utf8"))));
  const videos = items
    .filter((item) => item.status === "ready")
    .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
  return json(response, 200, { videos });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", publicUrl);
    const corsAllowed = setCors(request, response);
    if (request.method === "OPTIONS") return corsAllowed ? (response.writeHead(204), response.end()) : json(response, 403, { error: "Origin not allowed." });
    if (!corsAllowed) return json(response, 403, { error: "Origin not allowed." });
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { status: "ok" });
    if (request.method === "GET" && url.pathname === "/api/videos") return await listVideos(response);
    if (request.method === "GET" && url.pathname.startsWith("/api/status/")) {
      const id = url.pathname.split("/").pop();
      if (!/^[0-9a-f-]{36}$/.test(id || "")) return json(response, 400, { error: "Invalid upload." });
      try {
        const metadata = await readMetadata(id);
        return json(response, 200, { status: metadata.status, error: metadata.error });
      } catch {
        return json(response, 404, { error: "Upload not found." });
      }
    }
    if (request.method === "POST" && url.pathname === "/api/upload") return await receiveUpload(request, response, url);
    return json(response, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(response, 500, { error: "The server fumbled the upload. Try again." });
  }
});

server.requestTimeout = 20 * 60 * 1000;
server.listen(port, "127.0.0.1", () => console.log(`Video service listening on 127.0.0.1:${port}`));
