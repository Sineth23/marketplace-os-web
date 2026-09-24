import { Icon } from "../components/icon";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A place for every product.",
  description: "Inventory, photos, and next steps for electronics resellers. A little more organized.",
};

const steps = [
  {
    number: "01",
    icon: "box",
    title: "Bring your inventory",
    description: "One home for your SKUs, ready to connect each product to its photos.",
  },
  {
    number: "02",
    icon: "photos",
    title: "Put photos in order",
    description: "Turn a folder of product and sticker photos into organized groups.",
  },
  {
    number: "03",
    icon: "check",
    title: "Review with confidence",
    description: "Check the matches, make corrections, and know what belongs together.",
  },
] as const;

export default function OverviewPage() {
  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <Link className="brand" href="/" aria-label="Marketplace OS home">
          <span className="brand-mark" aria-hidden="true">
            m<span>.</span>
          </span>
          <span>
            marketplace<span className="brand-suffix">OS</span>
          </span>
        </Link>
        <a className="marketing-sign-in" href="/api/auth/sign-in">
          Sign in <Icon name="arrow" />
        </a>
      </header>
      <main className="marketing-main" id="main" tabIndex={-1}>
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">A fresh start</p>
            <h1 id="page-title">A place for every product.</h1>
            <p>Your inventory, photos, and next steps. A little more organized.</p>
          </div>
          <span className="edition-label">THE WORKSPACE / 001</span>
        </section>

        <section className="welcome-panel" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <span className="welcome-kicker">
              <span aria-hidden="true" />
              Made for electronics resellers
            </span>
            <h2 id="welcome-title">
              Less sorting.
              <br />
              More moving forward.
            </h2>
            <p>Give your products a clear path from a full shelf to a reviewed photo collection.</p>
            <a className="primary-link" href="#workflow">
              Explore the workflow <Icon name="arrow" />
            </a>
            <a className="primary-link" href="/api/auth/sign-in">
              Sign in to your workspace <Icon name="arrow" />
            </a>
            <span className="welcome-footnote">Inventory and photo organization for resale teams.</span>
          </div>
          <div className="product-illustration" aria-hidden="true">
            <div className="illustration-grid" />
            <div className="photo-sheet sheet-back" />
            <div className="photo-sheet sheet-front">
              <span className="photo-label">A NEW PERSPECTIVE</span>
              <div className="device">
                <div className="device-screen">
                  <span />
                </div>
                <div className="device-base" />
              </div>
              <div className="photo-caption">
                <span>Room for what’s next.</span>
                <span>↗</span>
              </div>
            </div>
            <div className="sku-ticket">
              <span className="ticket-icon">
                <Icon name="check" />
              </span>
              <div>
                <strong>Every detail, together.</strong>
                <span>From product to photos</span>
              </div>
            </div>
            <span className="illustration-orbit orbit-one" />
            <span className="illustration-orbit orbit-two" />
          </div>
        </section>

        <section className="workflow-section" id="workflow" aria-labelledby="workflow-title" tabIndex={-1}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">The bigger picture</p>
              <h2 id="workflow-title">From shelf to a clear next step.</h2>
            </div>
            <span className="muted-label">Built into your workspace</span>
          </div>
          <ol className="workflow-grid">
            {steps.map((step) => (
              <li key={step.number} className="workflow-card">
                <div className="step-top">
                  <span className="step-icon">
                    <Icon name={step.icon} />
                  </span>
                  <span className="step-number">{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="preview-note" aria-labelledby="preview-title">
          <span className="note-icon">
            <Icon name="link" />
          </span>
          <div>
            <h2 id="preview-title">A preview today. Your workspace next.</h2>
            <p>Sign in to import inventory, connect Google Drive, and prepare your photo review workflow.</p>
            <a className="secondary-link" href="/api/auth/sign-in">
              Open your workspace <Icon name="arrow" />
            </a>
          </div>
          <span className="outline-label">START HERE</span>
        </section>
      </main>
      <footer className="marketing-footer">
        <span>Marketplace OS</span>
        <span>Operations software for electronics resellers.</span>
      </footer>
    </div>
  );
}
