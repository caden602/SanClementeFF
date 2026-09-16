import UploadPanel from "@/components/UploadPanel";
import VideoGallery from "@/components/VideoGallery";
import { getVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const videos = await getVideos();

  return (
    <main>
      <div className="ticker" aria-hidden="true">
        <div>LOSER&apos;S COURT • NO EXCUSES • FILM THE APOLOGY • LOSER&apos;S COURT • NO EXCUSES • FILM THE APOLOGY •&nbsp;</div>
        <div>LOSER&apos;S COURT • NO EXCUSES • FILM THE APOLOGY • LOSER&apos;S COURT • NO EXCUSES • FILM THE APOLOGY •&nbsp;</div>
      </div>

      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="The Apology Tape home">
          <span className="brand-mark">AT</span>
          <span>THE APOLOGY TAPE</span>
        </a>
        <a className="header-link" href="#evidence">View the evidence ↓</a>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>●</span> OFFICIAL WEEKLY SHAME ARCHIVE</p>
          <h1>YOU LOST.<br /><em>EXPLAIN</em><br />YOURSELF.</h1>
          <p className="hero-sub">Ten minutes or less. One sincere-ish apology. Zero excuses about injuries, bye weeks, or “bad luck.”</p>
          <UploadPanel variant="hero" />
          <p className="upload-note">No account. No password. Unfortunately, no dignity.</p>
        </div>

        <div className="hero-card" aria-label="This week's loser notice">
          <div className="tape tape-one">CERTIFIED CHOKE</div>
          <div className="card-topline"><span>NOTICE OF</span><span>WEEKLY</span></div>
          <div className="verdict">L</div>
          <p className="card-title">PUBLIC<br />ACCOUNTABILITY</p>
          <div className="card-stamp">PAST DUE</div>
          <p className="card-foot">Failure to submit may result in relentless group chat harassment.</p>
        </div>
      </section>

      <section className="rules-bar">
        <div className="shell rules-inner">
          <div><strong>01</strong><span>Lose badly</span></div>
          <div><strong>02</strong><span>Record apology</span></div>
          <div><strong>03</strong><span>Live with it forever</span></div>
        </div>
      </section>

      <section className="evidence shell" id="evidence">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span>●</span> EXHIBITS A THROUGH EMBARRASSING</p>
            <h2>THE WALL OF SHAME</h2>
          </div>
          <div className="evidence-count"><strong>{String(videos.length).padStart(2, "0")}</strong><span>APOLOGIES<br />ON RECORD</span></div>
        </div>
        <VideoGallery videos={videos} />
      </section>

      <section className="closing">
        <div className="shell closing-inner">
          <p>“I&apos;D LIKE TO APOLOGIZE<br />TO MY TEAM, MY FAMILY,<br />AND THE SPORT OF FOOTBALL.”</p>
          <UploadPanel variant="footer" />
        </div>
      </section>

      <footer className="shell footer">
        <span>THE APOLOGY TAPE © {new Date().getFullYear()}</span>
        <span>BUILT FOR BAD MANAGERS &amp; GOOD FRIENDS</span>
      </footer>
    </main>
  );
}
