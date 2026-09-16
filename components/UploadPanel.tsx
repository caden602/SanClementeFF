"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "checking" | "uploading" | "success" | "error";

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
}

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
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const pathname = `apologies/${Date.now()}__${slug(week)}__${slug(loser)}__${crypto.randomUUID()}.${extension}`;

      await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: true,
        contentType: file.type || undefined,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

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
