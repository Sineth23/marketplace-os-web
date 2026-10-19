"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useEffect, cloneElement, Children, isValidElement } from "react";
import { Icon } from "../components/icon";

const COMPANY = "ListFlow";
const DESC =
  "Connect Amazon, eBay, Walmart, and Shopify from a single catalog. List once, sync inventory, and " +
  "let rule-based repricing keep every channel competitive — no manual copy-paste.";

const FEATURES = [
  {
    title: "List once, sell everywhere",
    body: "Publish to Amazon, eBay, Walmart, and Shopify from a single catalog. Field mapping saves so repeat uploads take seconds.",
  },
  {
    title: "Rule-based repricing",
    body: "Set min/max prices per channel and let ListFlow update prices automatically as competitors move. Protect your margins.",
  },
  {
    title: "Sync inventory everywhere",
    body: "Stock levels stay accurate across every marketplace. Overselling protection built in.",
  },
  {
    title: "One dashboard, every sale",
    body: "Live listing status, sync history, and orders in one place. No more jumping between seller portals.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Connect your stores",
    body: "Authorize Amazon, eBay, Walmart, and Shopify in one secure flow.",
  },
  {
    number: "02",
    title: "Import your catalog",
    body: "Upload a CSV or sync your inventory source. SKUs and variations are normalized automatically.",
  },
  {
    number: "03",
    title: "Set your rules",
    body: "Choose reprice frequency, min/max prices, and auto-approval for quantity updates.",
  },
  {
    number: "04",
    title: "Publish & sync",
    body: "Listings go live across channels. Prices and stock stay in sync in real time.",
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    amount: "$49",
    period: "/mo",
    description: "For small resellers getting started with multichannel listings.",
    featured: false,
    features: ["Up to 500 listings", "Amazon + eBay connections", "Manual repricing rules", "Email support"],
    cta: "Get started",
  },
  {
    name: "Growth",
    amount: "$149",
    period: "/mo",
    description: "For scaling teams automating listings and repricing across channels.",
    featured: true,
    features: [
      "Up to 5,000 listings",
      "All marketplaces (4 channels)",
      "Auto repricing rules",
      "Inventory sync guard",
      "Priority support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Scale",
    amount: "$399",
    period: "/mo",
    description: "For high-volume sellers with dedicated support and custom limits.",
    featured: false,
    features: [
      "Unlimited listings",
      "All marketplaces (4 channels)",
      "Custom repricing rules API",
      "Dedicated onboarding",
      "SLA support",
    ],
    cta: "Contact sales",
  },
] as const;

const STATS = [
  { label: "Marketplaces connected", value: "4" },
  { label: "Listings synced daily", value: "10k+" },
  { label: "Repricing rules", value: "Unlimited" },
  { label: "Sync success rate", value: "99.8%" },
] as const;

function Reveal({
  children,
  className = "",
  once = true,
  threshold = 0.12,
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
        { threshold, rootMargin: "0px 0px -10% 0px" },
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
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lf-root" id="lf-root">
      {/* ambient background */}
      <div className="lf-ambient" />

      {/* navigation */}
      <nav className={`lf-nav ${scrolled ? "scrolled" : ""}`} aria-label="Main navigation">
        <div className="lf-nav-inner">
          <Link className="lf-brand" href="/" aria-label={`${COMPANY} home`}>
            <span className="lf-mark" aria-hidden="true">
              lf
            </span>
            <span>{COMPANY}</span>
          </Link>
          <div className="lf-nav-actions">
            <a href="#start" className="lf-btn lf-btn-outline">
              Get started
            </a>
          </div>
        </div>
      </nav>

      <main className="lf-main" id="main" tabIndex={-1}>
        {/* Hero */}
        <section className="lf-hero" aria-labelledby="hero-title">
          <div className="lf-hero-inner">
            <div className="lf-hero-content">
              <div className="lf-kicker lf-reveal-child">
                <span className="lf-dot" aria-hidden="true" />
                <span>Multichannel listing automation</span>
              </div>
              <h1 id="hero-title" className="lf-title lf-reveal-child">
                List once.
                <br />
                Sell everywhere.
                <br />
                Reprice instantly.
              </h1>
              <p className="lf-lead lf-reveal-child">{DESC}</p>
              <div className="lf-hero-actions lf-reveal-child">
                <a href="#start" className="lf-btn lf-btn-primary">
                  Start free trial
                </a>
                <a href="#how-it-works" className="lf-btn lf-btn-outline">
                  How it works
                </a>
              </div>
            </div>
            <div className="lf-hero-visual lf-reveal-child" style={{ animationDelay: "0.2s" }}>
              <div className="lf-visual-card lf-visual-card-main">
                <div className="lf-visual-badge">Live</div>
                <div className="lf-visual-grid">
                  <div className="lf-visual-cell">IPH-13-128-BLU</div>
                  <div className="lf-visual-cell">Amazon • Live</div>
                  <div className="lf-visual-cell">$799.00</div>
                  <div className="lf-visual-cell">2m ago</div>
                </div>
              </div>
              <div className="lf-visual-card lf-visual-card-side">
                <div className="lf-visual-badge">Synced</div>
                <div className="lf-visual-grid">
                  <div className="lf-visual-cell">GAL-S23-256-BLK</div>
                  <div className="lf-visual-cell">eBay • Live</div>
                  <div className="lf-visual-cell">$649.00</div>
                  <div className="lf-visual-cell">8m ago</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="lf-stats" aria-labelledby="stats-title">
          <div className="lf-section-inner">
            <Reveal stagger={0.08} className="lf-stats-grid">
              {STATS.map((s) => (
                <div key={s.label} className="lf-stat lf-reveal-child">
                  <div className="lf-stat-value">{s.value}</div>
                  <div className="lf-stat-label">{s.label}</div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Features */}
        <section className="lf-section" id="features" aria-labelledby="features-title">
          <div className="lf-section-inner">
            <div className="lf-section-head lf-reveal-child">
              <p className="lf-eyebrow">What ListFlow does</p>
              <h2 id="features-title">Everything you need to sell everywhere</h2>
            </div>
            <Reveal stagger={0.09} className="lf-grid-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="lf-card lf-reveal-child">
                  <div className="lf-card-icon">
                    <Icon name="box" />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section
          className="lf-section"
          id="how-it-works"
          aria-labelledby="steps-title"
          style={{ background: "#f8fafc" }}
        >
          <div className="lf-section-inner">
            <div className="lf-section-head lf-reveal-child">
              <p className="lf-eyebrow">Getting started</p>
              <h2 id="steps-title">From catalog to live listings in minutes</h2>
            </div>
            <div className="lf-steps">
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className="lf-step lf-reveal-child"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="lf-step-number">{step.number}</div>
                  <div className="lf-step-content">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {i < STEPS.length - 1 && <div className="lf-step-connector" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="lf-section" id="pricing" aria-labelledby="pricing-title">
          <div className="lf-section-inner">
            <div
              className="lf-section-head lf-reveal-child"
              style={{ textAlign: "center", marginBottom: 48 }}
            >
              <p className="lf-eyebrow">Simple pricing</p>
              <h2 id="pricing-title">Pick the plan that fits your catalog</h2>
            </div>
            <Reveal stagger={0.08} className="lf-pricing-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`lf-price-card lf-reveal-child ${plan.featured ? "featured" : ""}`}
                >
                  {plan.featured && <span className="lf-ribbon">Most popular</span>}
                  <div className="lf-price-head">
                    <span className="lf-price-currency">$</span>
                    <span className="lf-price-amount">{plan.amount.replace("$", "")}</span>
                    <span className="lf-price-period">{plan.period}</span>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <ul className="lf-price-features">
                    {plan.features.map((f) => (
                      <li key={f} className="lf-reveal-child">
                        <span className="lf-check" aria-hidden="true">
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#start"
                    className="lf-btn lf-btn-primary"
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="lf-cta" id="start" aria-labelledby="cta-title">
          <div className="lf-cta-inner">
            <div className="lf-cta-content">
              <h2 id="cta-title">Ready to stop copying listings?</h2>
              <p>Connect your marketplaces, import your catalog, and let ListFlow handle the rest.</p>
              <div className="lf-cta-actions">
                <a href="#start" className="lf-btn lf-btn-primary">
                  Start free trial
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lf-footer" aria-label="Footer">
        <div className="lf-footer-inner">
          <div className="lf-footer-brand">
            <span className="lf-mark" aria-hidden="true">
              lf
            </span>
            <span>{COMPANY}</span>
          </div>
          <p className="lf-footer-note">
            ListFlow is a fictional demo brand. Listings automation, pricing, and dashboard shown for
            illustration.
          </p>
          <div className="lf-footer-bottom">
            <span style={{ fontSize: 12, opacity: 0.5 }}>© 2026 ListFlow Demo. Fictional brand.</span>
            <Link href="/" className="lf-brand" style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
              Back to top
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
