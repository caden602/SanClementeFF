import { list, type ListBlobResultBlob } from "@vercel/blob";

export type ApologyVideo = {
  url: string;
  pathname: string;
  loser: string;
  week: string;
  uploadedAt: string;
  size: number;
};

function friendly(value: string) {
  return decodeURIComponent(value).replace(/-/g, " ").trim();
}

function parseBlob(blob: ListBlobResultBlob): ApologyVideo | null {
  const filename = blob.pathname.split("/").pop();
  if (!filename) return null;

  const stem = filename.replace(/\.[^.]+$/, "");
  const [timestamp, week, loser] = stem.split("__");
  if (!timestamp || !week || !loser) return null;

  return {
    url: blob.url,
    pathname: blob.pathname,
    loser: friendly(loser),
    week: friendly(week),
    uploadedAt: new Date(Number(timestamp) || blob.uploadedAt).toISOString(),
    size: blob.size,
  };
}

export async function getVideos(): Promise<ApologyVideo[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];

  try {
    const { blobs } = await list({ prefix: "apologies/", limit: 100 });
    return blobs
      .map(parseBlob)
      .filter((video): video is ApologyVideo => Boolean(video))
      .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
  } catch (error) {
    console.error("Could not load apology videos", error);
    return [];
  }
}
