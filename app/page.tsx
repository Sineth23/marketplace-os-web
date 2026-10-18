"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useEffect, cloneElement, Children, isValidElement } from "react";
import { Icon } from "../components/icon";

/*
 * ListFlow — fictional multichannel listing automation brand.
 * Swap COMPANY / TAGLINE / colors in globals.css (:root --lf-*) to match your real company.
 */
const COMPANY = "ListFlow";

const MARKETPLACES = [
  { name: "Amazon", color: "#ff9900" },
  { name: "eBay", color: "#0064d2" },
  { name: "Walmart", color: "#007dc6" },
  { name: "Shopify", color: "#97bf0d" },
] as const;

const FEATURES = [
  {
    icon: "box",
    title: "Auto-list to every channel",
    body: "Upload your catalog once and publish to Amazon, eBay, Walmart, and Shopify in a single click. Field mapping is saved so repeat uploads take seconds.",
  },
  {
    icon: "trend-up",
    title: "Smart, rule-based repricing",
    body: "Set min/max price rules per marketplace and let ListFlow update prices automatically as competitors move. Protect your margins without watching a spreadsheet.",
  },
  {
    icon: "monitor",
    title: "One dashboard, every sale",
    body: "See live listing status, inventory, and sync history across all channels in one place. No more jumping between seller portals.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    icon: "link",
    title: "Connect your stores",
    body: "Authorize Amazon, eBay, Walmart, and Shopify in one flow.",
  },
  {
    number: "02",
    icon: "cpu",
    title: "Import your catalog",
    body: "Drag in a CSV or connect your inventory source. SKUs, photos, condition, and quantity are normalized automatically.",
  },
  {
    number: "03",
    icon: "dollar",
    title: "Set pricing rules",
    body: "Pick min and max prices per channel, choose reprice frequency, and enable auto-approval for quantity updates.",
  },
  {
    number: "04",
    icon: "zap",
    title: "Publish & sync",
    body: "Listings go live across channels. Prices and stock stay in sync, and the dashboard shows what sold and where.",
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    amount: "29",
    period: "/mo",
    description: "For small resellers getting started with multi-channel listings.",
    featured: false,
    ribbon: null,
    features: ["Up to 500 listings", "Amazon + eBay connections", "Manual repricing rules", "Email support"],
    cta: "Get started",
  },
  {
    name: "Growth",
    amount: "79",
    period: "/mo",
    description: "For scaling teams automating listings and repricing across channels.",
    featured: true,
    ribbon: "Most popular",
    features: [
      "Up to 5,000 listings",
      "All marketplaces (4 channels)",
      "Auto repricing rules",
      "Inventory sync guard",
      "Priority sync",
    ],
    cta: "Start free trial",
  },
  {
    name: "Scale",
    amount: "149",
    period: "/mo",
    description: "For high-volume sellers with dedicated support and custom limits.",
    featured: false,
    ribbon: null,
    features: [
      "Unlimited listings",
      "All marketplaces (4 channels)",
      "Auto repricing rules",
      "Inventory sync guard",
      "Dedicated onboarding",
    ],
    cta: "Contact sales",
  },
] as const;

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Marketplaces", href: "#marketplaces" },
  { label: "Pricing", href: "#pricing" },
  { label: "Dashboard", href: "#dashboard-preview" },
] as const;

function Reveal({
  children,
  className = "",
  once = true,
  threshold = 0.13,
  stagger = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  threshold?: number;
  stagger?: number;
}) {
  const [visible, setVisible] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = null;
      if (!node) return;
      observer.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry?.isIntersecting) {
            setVisible(true);
            if (once) observer.current?.disconnect();
          }
        },
        { threshold, rootMargin: "0px 0px -12% 0px" },
      );
      observer.current.observe(node);
    },
    [threshold, once],
  );

  const renderChildren = () => {
    if (!visible || stagger <= 0) return children;
    return Children.map(children, (child, index) => {
      if (!isValidElement(child)) return child;
      const element = child as React.ReactElement<{ style?: React.CSSProperties }>;
      return cloneElement(element, {
        ...element.props,
        style: {
          ...(element.props.style ?? {}),
          animationDelay: `${index * stagger}s`,
        },
      });
    });
  };

  return (
    <div ref={setRef} className={`reveal ${className}`} data-visible={visible ? "true" : undefined}>
      {renderChildren()}
    </div>
  );
}

export default function ListFlowPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const CHART_VALUES = [28, 42, 34, 56, 48, 70, 62];

  return (
    <div className="lf-root" id="lf-root">
      {/* animated background blobs */}
      <div className="lf-blob a" />
      <div className="lf-blob b" />
      <div className="lf-blob c" />

      {/* navigation */}
      <nav className={`lf-nav ${scrolled ? "shadow-nav" : ""}`} aria-label="Main navigation">
        <a className="skip-link lf-a11y-skip" href="#main">
          Skip to content
        </a>
        <div className="lf-nav-inner">
          <Link className="lf-brand" href="/" aria-label={`${COMPANY} home`}>
            <span className="lf-mark" aria-hidden="true">
              lf
            </span>
            <span>
              list<span style={{ color: "var(--lf-primary)" }}>flow</span>
            </span>
          </Link>
          <div className="lf-nav-links">
            {LINKS.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="lf-nav-actions">
            <Link href="/api/auth/sign-in" className="lf-btn-outline">
              Sign in
            </Link>
            <a href="#start" className="lf-btn-primary">
              Start free <Icon name="arrow" />
            </a>
          </div>
        </div>
      </nav>

      <main className="lf-main" id="main" tabIndex={-1}>
        {/* Hero */}
        <section className="lf-section" id="main" aria-labelledby="hero-title">
          <div className="lf-section-inner">
            <div className="lf-hero-grid">
              <div className="lf-hero-copy">
                <div className="lf-eyebrow lf-load-in">Listings automation for modern resellers</div>
                <h1 id="hero-title" className="lf-title lf-load-in">
                  List everywhere.
                  <br />
                  Reprice instantly.
                  <br />
                  Sell more.
                </h1>
                <p className="lf-lead lf-load-in">
                  Connect Amazon, eBay, Walmart, and Shopify from one dashboard. Auto-list your catalog, sync
                  inventory, and run rule-based repricing across every channel — no manual copy-paste.
                </p>
                <div className="lf-hero-actions">
                  <a href="#start" className="lf-btn-primary lf-load-in">
                    Start free trial <Icon name="arrow" />
                  </a>
                  <a
                    href="#dashboard-preview"
                    className="lf-btn-outline lf-load-in"
                    style={{ marginLeft: 12 }}
                  >
                    Explore the dashboard
                  </a>
                </div>
                <div className="lf-trust lf-load-in">
                  <span className="lf-kicker-dot" aria-hidden="true" />
                  <span>
                    Used by resale teams to manage <strong>10,000+ live listings</strong>
                  </span>
                </div>
              </div>
              <div className="lf-preview-wrap">
                <div className="lf-preview-card lf-float">
                  <div className="lf-preview-header">
                    <div className="lf-preview-brand">
                      <span className="lf-mark" aria-hidden="true">
                        lf
                      </span>
                      <div>
                        <strong>ListFlow</strong>
                        <span>Dashboard • Live</span>
                      </div>
                    </div>
                    <span className="lf-badge new">New listings synced</span>
                  </div>
                  <div className="lf-stats-row">
                    <div className="lf-stat">
                      <strong>24</strong>
                      <span>listings pushed today</span>
                    </div>
                    <div className="lf-stat">
                      <strong>$4.8k</strong>
                      <span>repriced this week</span>
                    </div>
                    <div className="lf-stat">
                      <strong>0</strong>
                      <span>manual uploads</span>
                    </div>
                  </div>
                  <div className="lf-chart-wrap" style={{ height: 120 }}>
                    {CHART_VALUES.map((value, i) => (
                      <div
                        key={i}
                        className="lf-chart-bar lf-chart-anim"
                        style={
                          {
                            animationDelay: `${i * 0.08}s`,
                            "--chart-height": `${value}%`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <div className="lf-table-wrap">
                    <table className="lf-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Channel</th>
                          <th>Status</th>
                          <th>Price</th>
                          <th>Synced</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="lf-sku">IPH-13-128-BLU</td>
                          <td>
                            <span className="lf-pill active">Amazon</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$799.00</td>
                          <td>2m ago</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">GAL-S23-256-BLK</td>
                          <td>
                            <span className="lf-pill active">eBay</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$649.00</td>
                          <td>8m ago</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">PIX-8-128-WHT</td>
                          <td>
                            <span className="lf-pill active">Walmart</span>
                          </td>
                          <td>
                            <span className="lf-pill draft">Draft</span>
                          </td>
                          <td>$549.00</td>
                          <td>—</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">IPH-14-256-RED</td>
                          <td>
                            <span className="lf-pill active">Shopify</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$849.00</td>
                          <td>14m ago</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="lf-platforms lf-load-in">
              <p className="lf-eyebrow">Connected marketplaces</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {MARKETPLACES.map((p) => (
                  <div
                    key={p.name}
                    className="lf-pill"
                    style={{
                      borderColor: colorMix(p.color, 35),
                      color: p.color,
                      background: colorMix(p.color, 10),
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities strip */}
        <section className="lf-capabilities" aria-label="What ListFlow automates">
          <div className="lf-cap-item">
            <div className="lf-cap-icon accent">
              <Icon name="globe" />
            </div>
            <h4>Auto-list everywhere</h4>
            <p>One catalog, every marketplace.</p>
          </div>
          <div className="lf-cap-item">
            <div className="lf-cap-icon brand">
              <Icon name="trend-up" />
            </div>
            <h4>Reprice automatically</h4>
            <p>Stay competitive without touching a spreadsheet.</p>
          </div>
          <div className="lf-cap-item">
            <div className="lf-cap-icon">
              <Icon name="trending" />
            </div>
            <h4>Sync inventory</h4>
            <p>Overselling protection across channels.</p>
          </div>
          <div className="lf-cap-item">
            <div className="lf-cap-icon brand">
              <Icon name="box" />
            </div>
            <h4>Order routing</h4>
            <p>One dashboard for every sale.</p>
          </div>
        </section>

        {/* Features */}
        <section className="lf-section" id="features" aria-labelledby="features-title">
          <div className="lf-section-inner">
            <div>
              <p className="lf-eyebrow">What ListFlow does</p>
              <h2 id="features-title">
                List once. <span className="lf-text-gradient">Sell everywhere.</span>
              </h2>
              <p className="lf-lead">
                Stop juggling seller portals. ListFlow connects your catalog, automates your listings, and
                keeps pricing accurate across Amazon, eBay, Walmart, and Shopify — all from one dashboard.
              </p>
            </div>
            <Reveal stagger={0.09} className="lf-grid-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="lf-card lf-reveal-child">
                  <div className="lf-card-icon">
                    <Icon name={feature.icon} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="lf-section" id="how-it-works" aria-labelledby="steps-title">
          <div className="lf-section-inner">
            <div>
              <p className="lf-eyebrow">Getting started</p>
              <h2 id="steps-title">
                From catalog to <span className="lf-text-gradient">live listings</span> in minutes.
              </h2>
            </div>
            <Reveal stagger={0.1} className="lf-steps">
              {STEPS.map((step) => (
                <div key={step.number} className="lf-step lf-reveal-child">
                  <div className="lf-step-head">
                    <span className="lf-step-number">{step.number}</span>
                    <div className="lf-step-icon">
                      <Icon name={step.icon} />
                    </div>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Dashboard preview */}
        <section
          className="lf-section"
          id="dashboard-preview"
          aria-labelledby="dashboard-title"
          style={{ background: "#fbfcf9" }}
        >
          <div className="lf-section-inner">
            <div className="lf-grid-2">
              <div className="lf-dashboard-copy">
                <p className="lf-eyebrow lf-reveal-child">Command center</p>
                <h2 id="dashboard-title" className="lf-title lf-reveal-child">
                  One <span className="lf-text-gradient">dashboard</span> for every channel.
                </h2>
                <p className="lf-lead lf-reveal-child">
                  View live listings, review sync history, adjust pricing rules, and approve inventory updates
                  without leaving ListFlow. Everything updates in real time.
                </p>
                <div className="lf-dashboard-highlights">
                  <div className="lf-highlight lf-reveal-child">
                    <span className="lf-kicker-dot" aria-hidden="true" />
                    <div>
                      <strong>Live listings</strong>
                      <span>Synced across Amazon, eBay, Walmart, Shopify</span>
                    </div>
                  </div>
                  <div className="lf-highlight lf-reveal-child">
                    <span className="lf-kicker-dot" aria-hidden="true" />
                    <div>
                      <strong>Auto repricing</strong>
                      <span>Rule-based price updates, scheduled or on demand</span>
                    </div>
                  </div>
                  <div className="lf-highlight lf-reveal-child">
                    <span className="lf-kicker-dot" aria-hidden="true" />
                    <div>
                      <strong>Inventory guard</strong>
                      <span>Stock levels stay accurate across every marketplace</span>
                    </div>
                  </div>
                </div>
                <a
                  href="/api/auth/sign-in"
                  className="lf-btn-primary lf-reveal-child"
                  style={{ display: "inline-block", marginTop: 14 }}
                >
                  Open dashboard <Icon name="arrow" />
                </a>
              </div>
              <div className="lf-preview-wrap lf-float" style={{ position: "relative" }}>
                <div className="lf-preview-card">
                  <div className="lf-preview-header">
                    <div className="lf-preview-brand">
                      <span className="lf-mark" aria-hidden="true">
                        lf
                      </span>
                      <div>
                        <strong>ListFlow</strong>
                        <span>Dashboard overview</span>
                      </div>
                    </div>
                    <span className="lf-badge new">All systems live</span>
                  </div>
                  <div className="lf-stats-row">
                    <div className="lf-stat">
                      <strong>1,244</strong>
                      <span>active listings</span>
                    </div>
                    <div className="lf-stat">
                      <strong>98%</strong>
                      <span>sync success rate</span>
                    </div>
                    <div className="lf-stat">
                      <strong>$84k</strong>
                      <span>gross merch value</span>
                    </div>
                  </div>
                  <div className="lf-chart-wrap" style={{ height: 130 }}>
                    {[44, 61, 52, 78, 65, 90, 82].map((value, i) => (
                      <div
                        key={i}
                        className="lf-chart-bar lf-chart-anim"
                        style={
                          {
                            animationDelay: `${i * 0.07}s`,
                            "--chart-height": `${value}%`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <div className="lf-table-wrap" style={{ marginTop: 18 }}>
                    <table className="lf-table">
                      <thead>
                        <tr>
                          <th>Listing</th>
                          <th>Channel</th>
                          <th>Status</th>
                          <th>Price</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="lf-sku">IPH-13-128-BLU</td>
                          <td>
                            <span className="lf-pill active">Amazon</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$799.00</td>
                          <td>2m ago</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">GAL-S23-256-BLK</td>
                          <td>
                            <span className="lf-pill active">eBay</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$649.00</td>
                          <td>8m ago</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">PIX-8-128-WHT</td>
                          <td>
                            <span className="lf-pill active">Walmart</span>
                          </td>
                          <td>
                            <span className="lf-pill draft">Draft</span>
                          </td>
                          <td>$549.00</td>
                          <td>—</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">IPH-14-256-RED</td>
                          <td>
                            <span className="lf-pill active">Shopify</span>
                          </td>
                          <td>
                            <span className="lf-pill active">Live</span>
                          </td>
                          <td>$849.00</td>
                          <td>14m ago</td>
                        </tr>
                        <tr>
                          <td className="lf-sku">MOT-G-STYL-128</td>
                          <td>
                            <span className="lf-pill active">Amazon</span>
                          </td>
                          <td>
                            <span className="lf-pill draft">Draft</span>
                          </td>
                          <td>$319.00</td>
                          <td>—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="lf-section" id="pricing" aria-labelledby="pricing-title">
          <div className="lf-section-inner">
            <div style={{ maxWidth: 560, margin: "0 auto 38px", textAlign: "center" }}>
              <p className="lf-eyebrow">Simple pricing</p>
              <h2 id="pricing-title">
                Pay as you <span className="lf-text-gradient">grow.</span>
              </h2>
            </div>
            <Reveal stagger={0.08} className="lf-pricing-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`lf-price-card lf-reveal-child ${plan.featured ? "featured" : ""}`}
                >
                  {plan.ribbon && <span className="lf-ribbon">{plan.ribbon}</span>}
                  <div className="lf-price-head">
                    <span className="lf-price-currency">$</span>
                    <span className="lf-price-amount">{plan.amount}</span>
                    <span className="lf-price-period">{plan.period}</span>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <ul className="lf-price-features">
                    {plan.features.map((f) => (
                      <li key={f} className="lf-reveal-child">
                        <span className="lf-check">
                          <Icon name="check" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#start"
                    className="lf-btn-primary"
                    style={{ width: "100%", display: "block", textAlign: "center" }}
                  >
                    {plan.cta} <Icon name="arrow" />
                  </a>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="lf-cta-band" id="start" aria-labelledby="cta-title">
          <div className="lf-cta-content">
            <h2 id="cta-title">Ready to list everywhere?</h2>
            <p>
              Start a free trial and connect Amazon, eBay, Walmart, and Shopify in minutes. No credit card
              required.
            </p>
            <div className="lf-cta-actions">
              <a href="#dashboard-preview" className="lf-btn-outline lf-load-in">
                Explore the dashboard
              </a>
              <a href="/api/auth/sign-in" className="lf-btn-primary lf-load-in">
                Start free trial
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lf-footer" aria-label="Footer">
        <div className="lf-footer-inner">
          <div className="lf-footer-top">
            <div>
              <div className="lf-footer-brand">
                <span className="lf-mark" aria-hidden="true">
                  lf
                </span>
                <span>
                  list<span style={{ color: "var(--lf-primary)" }}>flow</span>
                </span>
              </div>
              <p style={{ color: "var(--lf-muted)", fontSize: 11 }}>
                ListFlow is a fictional demo brand. Listings automation, pricing, and dashboard shown for
                illustration.
              </p>
            </div>
            <div className="lf-footer-links">
              <div>
                <strong>Product</strong>
                <a href="#features">Features</a>
                <a href="#how-it-works">How it works</a>
                <a href="#dashboard-preview">Dashboard</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div>
                <strong>Marketplaces</strong>
                <a href="#">Amazon</a>
                <a href="#">eBay</a>
                <a href="#">Walmart</a>
                <a href="#">Shopify</a>
              </div>
              <div>
                <strong>Company</strong>
                <a href="#">About</a>
                <a href="#">Terms</a>
                <a href="#">Privacy</a>
                <a href="#">Status</a>
              </div>
            </div>
          </div>
          <div className="lf-footer-bottom">
            <span style={{ fontSize: 10, opacity: 0.6 }}>© 2026 ListFlow Demo. Fictional brand.</span>
            <Link
              href="/"
              className="lf-brand"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--lf-muted)" }}
            >
              Back to top
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function colorMix(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}
