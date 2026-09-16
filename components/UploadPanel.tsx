"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "checking" | "uploading" | "success" | "error";

const videoApi = process.env.NEXT_PUBLIC_VIDEO_API_URL || "https://videos.2-24-124-55.sslip.io";

function fileDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn’t read that video. Try exporting it as MP4 or MOV."));
    };
    video.src = url;
  });
}

function uploadFile(file: File, loser: string, week: string, onProgress: (percentage: number) => void) {
  return new Promise<{ id: string }>((resolve, reject) => {
    const params = new URLSearchParams({ loser, week, filename: file.name });
    const request = new XMLHttpRequest();
    request.open("POST", `${videoApi}/api/upload?${params}`);
    request.setRequestHeader("Content-Type", file.type || "video/mp4");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("The upload lost connection. Check your signal and try again."));
    request.onload = () => {
      let result: { id?: string; error?: string } = {};
      try { result = JSON.parse(request.responseText); } catch {}
      if (request.status >= 200 && request.status < 300 && result.id) resolve({ id: result.id });
      else reject(new Error(result.error || "The server fumbled the upload. Try again."));
    };
    request.send(file);
  });
}

async function waitForProcessing(id: string) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`${videoApi}/api/status/${id}`, { cache: "no-store" });
    if (!response.ok) continue;
    const result = (await response.json()) as { status: string; error?: string };
    if (result.status === "ready") return;
    if (result.status === "error") throw new Error(result.error || "Video processing failed.");
  }
  throw new Error("The video is still processing. Refresh the page in a few minutes.");
}

export default function UploadPanel({ variant }: { variant: "hero" | "footer" }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loser, setLoser] = useState("");
  const [week, setWeek] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  function close() {
    if (status === "uploading") return;
    setOpen(false);
    setStatus("idle");
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !loser.trim() || !week.trim()) return;

    try {
      setStatus("checking");
      setMessage("Reviewing the tape…");
      const duration = await fileDuration(file);
      if (!Number.isFinite(duration) || duration > 600.5) {
        throw new Error("This masterpiece is over 10 minutes. Trim the excuses and try again.");
      }
      if (file.size > 750 * 1024 * 1024) {
        throw new Error("That file is over 750 MB. Choose a smaller export and try again.");
      }

      setStatus("uploading");
      setMessage("Submitting evidence…");
      const result = await uploadFile(file, loser.trim(), week.trim(), setProgress);
      setMessage("Making it playable on every phone…");
      await waitForProcessing(result.id);

      setStatus("success");
      setMessage("Apology accepted. Dignity denied.");
      setProgress(100);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed. The football gods remain unimpressed.");
    }
  }

  return (
    <>
      <button className={`upload-trigger ${variant}`} type="button" onClick={() => setOpen(true)}>
        <span className="upload-icon" aria-hidden="true">↑</span>
        <span>{variant === "hero" ? "UPLOAD YOUR APOLOGY" : "CONFESS YOUR FAILURE"}</span>
        <span className="button-arrow" aria-hidden="true">→</span>
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <button className="modal-close" type="button" onClick={close} aria-label="Close upload form">×</button>
            <p className="eyebrow"><span>●</span> ENTER THE CONFESSIONAL</p>
            <h2 id="upload-title">SUBMIT YOUR<br /><em>SHAME.</em></h2>
            <p className="modal-intro">Three fields. No account. Even you can handle this.</p>

            {status === "success" ? (
              <div className="success-panel" aria-live="polite">
                <span>✓</span>
                <h3>IT&apos;S ON THE RECORD.</h3>
                <p>{message}</p>
                <button type="button" onClick={close}>View the wall of shame</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label className="file-drop">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/*,.mov,.mp4,.m4v,.webm,.avi,.3gp,.mpeg"
                    required
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      setStatus("idle");
                      setMessage("");
                    }}
                  />
                  <span className="file-plus">+</span>
                  <strong>{file ? file.name : "CHOOSE A VIDEO"}</strong>
                  <small>{file ? `${Math.round(file.size / 1024 / 1024)} MB — tap to replace` : "From your camera roll • max 10 min"}</small>
                </label>

                <div className="field-row">
                  <label><span>Name of the accused</span><input value={loser} onChange={(e) => setLoser(e.target.value)} placeholder="e.g. Mike" maxLength={50} required /></label>
                  <label><span>Week of the crime</span><input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. Week 7" maxLength={30} required /></label>
                </div>

                {(status === "checking" || status === "uploading") && (
                  <div className="progress-wrap" aria-live="polite">
                    <div className="progress-copy"><span>{message}</span><strong>{status === "checking" ? "" : `${progress}%`}</strong></div>
                    <div className="progress-track"><div style={{ width: `${status === "checking" ? 8 : progress}%` }} /></div>
                    <small>Keep this page open. The walk of shame takes a minute.</small>
                  </div>
                )}

                {status === "error" && <p className="form-error" role="alert">{message}</p>}

                <button className="submit-button" type="submit" disabled={!file || !loser.trim() || !week.trim() || status === "uploading" || status === "checking"}>
                  {status === "uploading" || status === "checking" ? "HOLD STILL…" : "MAKE IT PUBLIC"}<span>→</span>
                </button>
                <p className="privacy-note">By uploading, you confirm everyone in the video is cool with the league seeing it.</p>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
