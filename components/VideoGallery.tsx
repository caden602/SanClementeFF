import type { ApologyVideo } from "@/lib/videos";

function formatBytes(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export default function VideoGallery({ videos }: { videos: ApologyVideo[] }) {
  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-flag">NO EVIDENCE... YET.</div>
        <div className="empty-icon" aria-hidden="true">☹</div>
        <h3>Apparently everyone&apos;s undefeated.</h3>
        <p>The first loser of the season gets the honor of ruining this beautiful blank space.</p>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((video, index) => (
        <article className="video-card" key={video.url}>
          <div className="video-frame">
            <video controls preload="metadata" playsInline>
              <source src={video.url} />
              Your browser cannot play this video. It may be trying to protect you.
            </video>
            <span className="exhibit">EXHIBIT {String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="video-details">
            <div>
              <p>{video.week}</p>
              <h3>{video.loser}</h3>
            </div>
            <div className="video-meta">{formatDate(video.uploadedAt)}<br />{formatBytes(video.size)}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
