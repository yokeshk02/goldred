/**
 * Velvet Ledger reminder: utility states stay inside the private archive with oxblood surfaces, bone serif type, antique gold actions, and authored copy.
 */
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return <main className="not-found-shell">
    <div className="not-found-grid" />
    <div className="not-found-card">
      <Link href="/" className="not-found-brand"><img src="/manus-storage/aurelia-mark_a88bd349.png" alt="" /><span>Aurelia</span></Link>
      <div className="not-found-rule"><span>ARCHIVE NOTE</span><span>404 / 01</span></div>
      <p className="eyebrow"><span className="gold-line" /> ENTRY MISPLACED</p>
      <h1>This ledger<br /><em>is closed.</em></h1>
      <p className="not-found-copy">The page you were looking for has slipped out of this edition. Return to your desk and continue from a clearer place.</p>
      <Link href="/" className="gold-button"><ArrowLeft size={16} /> Return to the desk <ArrowUpRight size={15} /></Link>
      <div className="not-found-footer"><span>PRIVATE BY DESIGN</span><span>© 2026 AURELIA DESK</span></div>
    </div>
  </main>;
}
