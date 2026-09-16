export type ApologyVideo = {
  url: string;
  id: string;
  loser: string;
  week: string;
  uploadedAt: string;
  size: number;
};

const videoApi = process.env.VIDEO_API_URL || "https://videos.2-24-124-55.sslip.io";

export async function getVideos(): Promise<ApologyVideo[]> {
  try {
    const response = await fetch(`${videoApi}/api/videos`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Video API returned ${response.status}`);
    const data = (await response.json()) as { videos: ApologyVideo[] };
    return data.videos;
  } catch (error) {
    console.error("Could not load apology videos", error);
    return [];
  }
}
