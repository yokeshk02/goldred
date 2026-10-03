/**
 * Velvet Ledger reminder: asymmetric editorial layout, oxblood foundations, antique gold only for focus and value, tactile image panels, quiet motion.
 */
import { useState } from "react";
import { ArrowUpRight, Bell, ChevronRight, Circle, Compass, Grid2X2, Menu, MoreHorizontal, Plus, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: Grid2X2, active: true },
  { label: "Collections", icon: Compass },
  { label: "Signals", icon: Sparkles },
];

const ledgerItems = [
  { id: "01", title: "The quiet power of restraint", type: "ESSAY / 08 MIN", tag: "Editorial", image: "/manus-storage/aurelia-gold-architecture_3464f8cb.jpg" },
  { id: "02", title: "Material studies: Garnet", type: "REFERENCE / 12 IMAGES", tag: "Archive", image: "/manus-storage/aurelia-silk_f0c71229.jpg" },
  { id: "03", title: "A field guide to considered work", type: "NOTE / 04 MIN", tag: "Practice", image: "/manus-storage/aurelia-hero_f58ed13c.jpg" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const notify = (message: string) => toast(message);

  return (
    <main className="aurelia-shell">
      <aside className={`side-rail ${menuOpen ? "is-open" : ""}`}>
        <div className="rail-top">
          <a className="brand" href="#top" aria-label="Aurelia home">
            <img src="/manus-storage/aurelia-mark_a88bd349.png" alt="" className="brand-mark" />
            <span>Aurelia</span>
          </a>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="rail-label">YOUR DESK</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button key={label} className={`rail-link ${active ? "active" : ""}`} onClick={() => notify(`${label} view selected`)}>
              <Icon size={17} strokeWidth={1.6} /><span>{label}</span>{active && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="rail-rule" />
        <div className="rail-label">PINNED</div>
        <button className="rail-link" onClick={() => notify("Pinned notes coming soon")}><Circle size={12} fill="currentColor" /><span>My notes</span><span className="nav-count">04</span></button>
        <button className="rail-link" onClick={() => notify("Saved items coming soon")}><Circle size={12} fill="currentColor" /><span>Saved</span><span className="nav-count">12</span></button>
        <div className="rail-bottom">
          <div className="rail-label">CURRENTLY</div>
          <div className="currently-card"><span className="pulse" /><div><strong>Curating slowly</strong><small>Session 14 · Private</small></div></div>
          <button className="profile-chip" onClick={() => notify("Profile settings coming soon")}><span className="avatar">AR</span><span>Alex Rivera</span><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <section className="main-stage" id="top">
        <header className="topbar">
          <button className="icon-button menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb"><span>YOUR DESK</span><ChevronRight size={14} /><strong>OVERVIEW</strong></div>
          <div className="top-actions"><button className="search-button" onClick={() => notify("Search is ready for your archive")}><Search size={17} /><span>Search archive</span><kbd>⌘ K</kbd></button><button className="icon-button" onClick={() => notify("No new signals") } aria-label="Notifications"><Bell size={18} /><i className="notification-dot" /></button></div>
        </header>

        <div className="content-wrap">
          <section className="hero-block">
            <div className="hero-copy">
              <p className="eyebrow"><span className="gold-line" /> 31 AUGUST 2026</p>
              <h1>Make the next<br /><em>move</em> visible.</h1>
              <p className="hero-deck">A considered space for the work that matters. Keep your references close, your signals clear, and your attention where it belongs.</p>
              <div className="hero-actions"><button className="gold-button" onClick={() => document.getElementById("ledger")?.scrollIntoView({ behavior: "smooth" })}>Open the ledger <ArrowUpRight size={16} /></button><button className="text-button" onClick={() => notify("Aurelia is a quiet place for considered work")}>How it works <ChevronRight size={15} /></button></div>
            </div>
            <div className="hero-art"><div className="hero-image" /><div className="hero-caption"><span>01 / 03</span><span>THE MATERIAL WORLD</span></div><div className="hero-stamp">A<br />R</div></div>
          </section>

          <section className="insight-strip" aria-label="Desk insights">
            <div className="insight-intro"><p className="eyebrow">AT A GLANCE</p><span>Your desk, in focus.</span></div>
            <div className="insight"><span className="insight-number">12</span><div><span className="insight-label">SAVED REFERENCES</span><small>+03 this week</small></div></div>
            <div className="insight"><span className="insight-number">04</span><div><span className="insight-label">OPEN THREADS</span><small>02 need attention</small></div></div>
            <div className="insight accent"><span className="insight-number">87%</span><div><span className="insight-label">CLARITY INDEX</span><small>↑ 8.4% this month</small></div></div>
          </section>

          <section className="ledger-section" id="ledger">
            <div className="section-heading"><div><p className="eyebrow"><span className="gold-line" /> CURATED FOR YOU</p><h2>The living ledger</h2></div><button className="outline-button" onClick={() => notify("All archive entries are coming soon")}>View all <ArrowUpRight size={15} /></button></div>
            <div className="ledger-list">
              {ledgerItems.map((item, index) => <article className="ledger-card" key={item.id} style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}>
                <div className="card-number">{item.id}</div><div className="card-image" style={{ backgroundImage: `url(${item.image})` }} /><div className="card-copy"><span className="card-tag">{item.tag}</span><h3>{item.title}</h3><span className="card-meta">{item.type}</span></div><button className="card-arrow" onClick={() => notify(`Opening “${item.title}”`)} aria-label={`Open ${item.title}`}><ArrowUpRight size={18} /></button>
              </article>)}
            </div>
          </section>

          <section className="bottom-note"><div><p className="eyebrow"><span className="gold-line" /> A SMALL REMINDER</p><p className="note-text">“Attention is the rarest and purest form of generosity.”</p><span className="note-source">— SIMONE WEIL</span></div><button className={`save-button ${saved ? "saved" : ""}`} onClick={() => { setSaved(!saved); notify(saved ? "Reminder removed" : "Reminder saved to your desk"); }}>{saved ? "Saved" : "Save reminder"}<Plus size={15} /></button></section>
          <footer><span>© 2026 AURELIA DESK</span><span>PRIVATE BY DESIGN</span><span>V. 1.0.7</span></footer>
        </div>
      </section>
    </main>
  );
}
