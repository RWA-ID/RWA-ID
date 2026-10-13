import { useState } from "react";
import "@/styles/dashboard-base.css";
import "@/styles/dashboard-landing.css";
import "@/styles/landing-scale.css";

const CONTRACT_ADDRESS = "0x6413e9E6A0D4e05557463A66C34E18192324A2C7";
const EXPLORER_URL = `https://etherscan.io/address/${CONTRACT_ADDRESS}#code`;
const DASHBOARD_URL = "https://dashboard.rwa-id.com";
const CONTACT_EMAIL = "partner@rwa-id.com";
const X_URL    = "https://x.com/rwa_ideth";
const X_HANDLE = "@rwa_ideth";
const WEB3FORMS_KEY = "c4621259-2059-4c10-8cb4-d6e8cba3d236";

/* The six chains a name answers on. `file` is the asset in /public/brand/chains. */
const CHAINS = [
  { name: "Ethereum", file: "ethereum.svg" },
  { name: "Base", file: "base.svg" },
  { name: "Arbitrum", file: "arbitrum-one.svg" },
  { name: "Optimism", file: "optimism.svg" },
  { name: "Polygon", file: "polygon.svg" },
  { name: "Linea", file: "linea.svg" },
];

const WALLETS = [
  { name: "MetaMask", file: "metamask.svg" },
  { name: "Trust", file: "trust.svg" },
  { name: "Rainbow", file: "rainbow.svg" },
  { name: "Uniswap", file: "uniswap.svg" },
  { name: "Coinbase", file: "coinbase.svg" },
  { name: "Safe", file: "safe.svg" },
];

/* The strip under the hero. `stat` promotes a figure above the title; `live`
   prefixes the pulsing status dot. `tone` picks the icon well's tint. */
const TRUST: {
  icon: TrustIcon;
  tone: "good" | "accent";
  stat?: string;
  live?: boolean;
  title: string;
  note: string;
}[] = [
  {
    icon: "globe", tone: "good", live: true,
    title: "Live on Ethereum Mainnet",
    note: "Production-ready and resolving in real time.",
  },
  {
    icon: "shield", tone: "accent", stat: "68",
    title: "Contract tests passing",
    note: "Robust, secure, and battle-tested.",
  },
  {
    icon: "bookmark", tone: "accent", stat: "25",
    title: "Top RWA slugs reserved",
    note: "Premium namespaces secured for builders.",
  },
  {
    icon: "code", tone: "good",
    title: "CCIP-Read gateway active",
    note: "Gasless resolution across any chain.",
  },
  {
    icon: "sparkle", tone: "accent",
    title: "ENS wildcard resolver live",
    note: "Advanced resolution for any subname.",
  },
];

const DASHBOARD_FEATURES = [
  ["Live project stats", "Total claimed identities, revenue earned, current claim fee, treasury address and active/paused status, in real time."],
  ["Allowlist management", "Upload a CSV or add entries manually. Load an existing tree from IPFS to extend it without losing previous entries."],
  ["Update claim fee", "Adjust the per-claim USDC fee at any time. The contract enforces the $0.50 protocol minimum automatically."],
  ["Treasury control", "Update the wallet that receives your 70% revenue share from each claim with a single onchain transaction."],
  ["Transferability override", "Set soulbound or transferable at the project level — and override it on individual tokens if needed."],
  ["Identity lookup & revoke", "Search any claimed identity by name, see its status onchain, and permanently revoke it to burn the token and blacklist the name."],
  ["Pause & unpause", "Freeze new claims at any time while keeping all existing identities intact. Unpause when you are ready to re-open."],
  ["Transfer ownership", "Hand off project admin rights to any wallet address — the new owner gains full control immediately."],
  ["Shareable claim URLs", "After uploading an allowlist, a unique claim URL is generated automatically to share with your clients."],
];

const DOES = [
  "Provides human-readable identity references",
  "Enables name resolution across wallets and dApps",
  "Facilitates onchain identity registration",
  "Supports platform operations and revenue sharing",
];

const DOES_NOT = [
  "Collect or store personal data",
  "Perform KYC or identity verification",
  "Assert or validate identity claims",
  "Custody funds or assets",
];

type TrustIcon = "globe" | "shield" | "bookmark" | "code" | "sparkle";

const TRUST_PATHS: Record<TrustIcon, React.ReactNode> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4" />
      <path d="M12 2.8a14.2 14.2 0 0 1 0 18.4 14.2 14.2 0 0 1 0-18.4Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.6 4.6 5.7v5.6c0 4.6 3.1 8.8 7.4 10.1 4.3-1.3 7.4-5.5 7.4-10.1V5.7L12 2.6Z" />
      <path d="m9.1 11.9 2 2 3.8-3.9" />
    </>
  ),
  bookmark: <path d="M18.2 21.4 12 17.2l-6.2 4.2V4.9a2.3 2.3 0 0 1 2.3-2.3h7.8a2.3 2.3 0 0 1 2.3 2.3v16.5Z" />,
  code: (
    <>
      <path d="m8.4 17.2-5.2-5.2 5.2-5.2" />
      <path d="m15.6 6.8 5.2 5.2-5.2 5.2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 2.8 12.9 8 18 9.9 12.9 11.8 11 17l-1.9-5.2L4 9.9 9.1 8 11 2.8Z" />
      <path d="M18.2 15.1 19 17.3l2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
};

function TrustGlyph({ name }: { name: TrustIcon }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRUST_PATHS[name]}
    </svg>
  );
}

function Check({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* The phone mock. Screen offsets are percentages measured against hand-phone.png. */
function PhoneMock() {
  return (
    <div className="hero-photo">
      <img
        src="/brand/hand-phone.png"
        alt="A client holding a phone showing their verified RWA-ID identity"
        className="hero-photo-img"
      />
      <div className="phone-screen">
        <div className="phone-glare" />

        <div className="phone-row phone-head">
          <span className="phone-title">Wallet</span>
          <span className="phone-resolved"><span className="phone-dot" />RESOLVED</span>
        </div>

        <div className="phone-identity">
          <span className="phone-avatar">
            <img src="/brand/avatar.svg" alt="" />
          </span>
          <span className="phone-identity-text">
            <span className="phone-name">joe.rwa-id.eth</span>
            <span className="phone-addr">0x7F3a…E6f7</span>
          </span>
          <span className="phone-check"><Check size={12} /></span>
        </div>

        <div className="phone-segment">
          <span>Tokens</span><span className="is-active">Names</span>
        </div>

        <div className="phone-row phone-label-row">
          <span className="phone-label">RESOLVES ON</span>
          <span className="phone-label dim">{CHAINS.length} CHAINS</span>
        </div>

        <div className="phone-list">
          {CHAINS.map((c, i) => (
            <span key={c.file} className="phone-list-row" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
              <span className="phone-chain-mark"><img src={`/brand/chains/${c.file}`} alt="" /></span>
              <span className="phone-chain-name">{c.name}</span>
              <span className="phone-check sm"><Check size={11} /></span>
            </span>
          ))}
        </div>

        <div className="phone-spacer" />
        <div className="phone-foot"><span className="phone-foot-dot" />SOULBOUND · #2841</div>
        <div className="phone-home"><span /></div>
      </div>
    </div>
  );
}

function Faq({ q, children, open = false }: { q: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open}>
      <summary>{q}<span className="mk-faq-sign" /></summary>
      <div className="mk-faq-body">{children}</div>
    </details>
  );
}

function LogoTile({ dir, file, label }: { dir: string; file: string; label: string }) {
  return (
    <span className="logo-tile">
      <span className="logo-tile-mark"><img src={`/brand/${dir}/${file}`} alt="" width="36" height="36" /></span>
      <span className="logo-tile-label">{label}</span>
    </span>
  );
}

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const [contactResult, setContactResult] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [inquiryType, setInquiryType] = useState("");

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactResult("sending");
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("access_key", WEB3FORMS_KEY);
    formData.set("subject", `RWA-ID Inquiry: ${inquiryType || "General"}`);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setContactResult("success");
        form.reset();
        setInquiryType("");
      } else {
        setContactResult("error");
      }
    } catch {
      setContactResult("error");
    }
  };

  return (
    <div className="landing">

      {/* ── Nav ── */}
      <nav className="l-nav">
        <div className="l-brand">
          <span className="l-brand-mark">R</span>
          <span className="l-brand-word">RWA&middot;ID</span>
        </div>
        <div className="l-nav-links">
          <a className="l-nav-pill" href="#platforms">Platforms</a>
          <a className="l-nav-pill" href="#resolution">Resolution</a>
          <a className="l-nav-pill" href="#faq">How it works</a>
          <a className="btn btn-accent btn-pill" href={DASHBOARD_URL} target="_blank" rel="noreferrer"
             data-testid="button-launch-dashboard">
            Launch Dashboard
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero mk-hero">
        <div className="hero-card">
          <div className="hero-badge">
            <span className="hero-badge-dot" />LIVE ON ETHEREUM MAINNET
          </div>

          <h1 className="display mk-h1">
            Identity for<br />
            <span className="dim">real-world asset</span><br />
            <span className="dim">platforms and</span><br />
            client wallets.
          </h1>

          <p className="lede hero-lede">
            Verifiable, ENS-compatible onchain identities for your clients — without touching KYC or
            internal ID systems. Non-custodial, resolvable on any chain, auditable by anyone.
          </p>

          <div className="row row-wrap">
            <a className="btn btn-accent btn-lg" href={DASHBOARD_URL} target="_blank" rel="noreferrer">
              Launch Dashboard
            </a>
            <a className="btn btn-lg hero-ghost" href="#contact" data-testid="button-contact">Talk to us</a>
          </div>

          <a className="mk-textlink" href="#resolution">See how a name resolves →</a>
        </div>

        <PhoneMock />
      </section>

      {/* ── Trust strip ── */}
      <section className="l-strip">
        <div className="mk-trust">
          {TRUST.map((t) => (
            <article key={t.title} className={`mk-stat is-${t.tone}`}>
              <span className="mk-stat-icon"><TrustGlyph name={t.icon} /></span>
              <div className="mk-stat-body">
                {t.stat && <span className="mk-stat-num">{t.stat}</span>}
                <h3 className="mk-stat-title">
                  {t.live && <span className="mk-stat-dot" />}
                  {t.title}
                </h3>
                <p className="mk-stat-note">{t.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── For platforms ── */}
      <section className="l-section mk-section" id="platforms">
        <div className="l-section-head">
          <h2 className="display-2 mk-h2">For<br /><span className="dim">platforms.</span></h2>
          <p className="l-section-lede">
            Create your RWA-ID namespace and issue identities to your users at scale. Three steps,
            all onchain, no backend to run.
          </p>
        </div>

        <div className="l-cards">
          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>
              </span>
              <span className="mono-label">Step 01</span>
            </div>
            <h3 className="l-card-title">Create namespace</h3>
            <p className="body">
              Register your unique project slug and establish your identity namespace onchain. Every
              client name lives under it as <span className="code-inline">name.yourfirm.rwa-id.eth</span>.
            </p>
          </article>

          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
              </span>
              <span className="mono-label">Step 02</span>
            </div>
            <h3 className="l-card-title">Upload allowlist</h3>
            <p className="body">
              Upload a CSV of names and wallet addresses to generate a Merkle tree. Only the root hash
              goes onchain, so the list stays private and the gas cost stays flat.
            </p>
          </article>

          <article className="l-card">
            <div className="l-card-head">
              <span className="l-card-icon">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
              </span>
              <span className="mono-label">Step 03</span>
            </div>
            <h3 className="l-card-title">Earn revenue</h3>
            <p className="body">
              Set a claim fee in USDC — 70% goes directly to your treasury on every claim,
              automatically, with no payout to request.
            </p>
          </article>
        </div>

        <article className="l-card l-card-dark" style={{ marginTop: 14 }}>
          <div className="l-card-head"><span className="mono-label">Revenue sharing</span></div>
          <div className="mk-revenue">
            <div>
              <h3 className="l-card-title light">You set the fee.<br />You keep 70%.</h3>
              <p className="body light mk-revenue-lede">
                Every identity claim is split 70/30 onchain between your treasury and the protocol.
                A $0.50 minimum is enforced by the contract — even if you set no fee.
              </p>
              <p className="mono-label light mk-revenue-note">Enforced onchain — no trust required</p>
            </div>
            <table className="mk-table">
              <thead>
                <tr><th>Claim fee set</th><th>Your treasury (70%)</th><th>Protocol (30%)</th></tr>
              </thead>
              <tbody>
                <tr><td>None (minimum applied)</td><td className="good">$0.35</td><td className="mute">$0.15</td></tr>
                <tr><td>$1.00</td><td className="good">$0.70</td><td className="mute">$0.30</td></tr>
                <tr><td>$5.00</td><td className="good">$3.50</td><td className="mute">$1.50</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* ── For users ── */}
      <section className="l-section mk-section">
        <div className="l-section-head">
          <h2 className="display-2 mk-h2">For<br /><span className="dim">users.</span></h2>
          <p className="l-section-lede">
            Claim your verified onchain identity through your RWA platform. Four steps, one wallet,
            no account to create.
          </p>
        </div>

        <div className="mk-two">
          <div className="mk-panel">
            <ul className="l-list">
              <li><Check size={13} /> Your platform provides you with a unique claim URL</li>
              <li><Check size={13} /> Connect your wallet and your identity is automatically detected</li>
              <li><Check size={13} /> Approve any claim fee and sign the transaction</li>
              <li><Check size={13} /> Receive your resolved name: <span className="code-inline">name.slug.rwa-id.eth</span></li>
            </ul>
            <div className="l-transfer" style={{ marginTop: 22 }}>
              <div className="l-transfer-row"><span className="mono-label">Send 250 tokenized AAPL to</span></div>
              <div className="l-transfer-name" data-testid="text-example-identity">joe.yourfirm.rwa-id.eth</div>
              <div className="l-transfer-foot">
                <span className="pill pill-good"><span className="dot" />Verified client</span>
                <span className="mono-note">resolves to 0x7F3a…E6f7</span>
              </div>
            </div>
          </div>

          <div className="mk-panel mk-panel-center">
            <span className="l-brand-mark mk-mark-lg">R</span>
            <h3 className="l-card-title">How do I claim?</h3>
            <p className="body" style={{ maxWidth: "42ch" }}>
              Your RWA platform will provide a claim link once your identity has been assigned. Open
              the link, connect your wallet, and claim your onchain identity token — soulbound or
              transferable depending on your platform's configuration.
            </p>
          </div>
        </div>
      </section>

      {/* ── Platform dashboard ── */}
      <section className="l-section mk-section">
        <div className="l-section-head mk-head-center">
          <h2 className="display-2 mk-h2">Platform <span className="dim">dashboard.</span></h2>
          <p className="l-section-lede">
            Full project management from a single interface — no backend, no indexer, all reads go
            directly to the contract.
          </p>
        </div>

        <div className="mk-features">
          {DASHBOARD_FEATURES.map(([title, desc]) => (
            <div key={title} className="mk-feature">
              <div className="mk-feature-head"><Check /><h3 className="mk-feature-title">{title}</h3></div>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <div className="row row-wrap" style={{ justifyContent: "center", marginTop: 30 }}>
          <a className="btn btn-accent btn-lg" href={DASHBOARD_URL} target="_blank" rel="noreferrer"
             data-testid="button-dashboard-cta">
            Open Platform Dashboard →
          </a>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="l-section mk-section" id="faq">
        <div className="l-section-head mk-head-center">
          <h2 className="display-2 mk-h2">How it <span className="dim">works.</span></h2>
          <p className="l-section-lede">
            The mechanics behind a claim — Merkle proofs, soulbound tokens, and where the money goes.
          </p>
        </div>

        <div className="mk-faq">
          <Faq q="What is Merkle proof verification?" open>
            <p>
              Merkle trees let us verify that a specific wallet + name combination is part of an
              allowlist without storing the entire list onchain. Only the root hash is stored, making
              it extremely gas-efficient to support millions of claims.
            </p>
          </Faq>

          <Faq q="What are soulbound tokens?">
            <p>
              Soulbound tokens (SBTs) are non-transferable NFTs that represent identity, credentials
              or affiliations. Once claimed, they are permanently bound to your wallet address and
              cannot be sold or transferred.
            </p>
          </Faq>

          <Faq q="How is the leaf hash computed?">
            <p>Each leaf in the Merkle tree is computed as:</p>
            <pre>{`nameHash = keccak256(name.trim().toLowerCase())
leaf     = keccak256(abi.encodePacked(address, nameHash))`}</pre>
            <p>
              The name is trimmed and converted to lowercase, then hashed before being packed with
              the address.
            </p>
          </Faq>

          <Faq q="What CSV format is required?">
            <p>
              The CSV should have two columns, <span className="code-inline">name</span> and{" "}
              <span className="code-inline">address</span>. For example:
            </p>
            <pre>{`name,address
hector,0x1234567890abcdef1234567890abcdef12345678
alice,0xabcdef1234567890abcdef1234567890abcdef12`}</pre>
          </Faq>

          <Faq q="How do users claim their identity?">
            <p>
              After a platform uploads its allowlist and sets the Merkle root onchain, a unique claim
              URL is generated. The platform shares this URL with its users.
            </p>
            <p>
              Users open the link, connect their wallet, and their identity is automatically detected
              from the proof file stored on IPFS. If a claim fee is set, they approve the USDC spend
              and claim their identity token in a single flow — soulbound or transferable as
              configured by the platform.
            </p>
          </Faq>

          <Faq q="How does the revenue model work?">
            <p>
              Every identity claim pays a fee in USDC that is split 70/30 onchain: 70% goes directly
              to the platform's treasury wallet, and 30% goes to the RWA-ID protocol.
            </p>
            <p>
              Platforms set their own claim fee. A $0.50 minimum is enforced at the contract level —
              it cannot be bypassed. If a platform sets no fee, the contract applies the $0.50
              minimum and distributes it with the same 70/30 split ($0.35 to the platform, $0.15 to
              the protocol).
            </p>
            <p>The split is automatic and trustless — no manual payouts, no intermediaries.</p>
          </Faq>
        </div>
      </section>

      {/* ── Cross-chain resolution ── */}
      <section className="l-section mk-section" id="resolution">
        <div className="l-section-head mk-head-center">
          <h2 className="display-2 mk-h2">Cross-chain name <span className="dim">resolution.</span></h2>
          <p className="l-section-lede">
            RWA-ID names resolve across major blockchains and wallets via Chainlink CCIP.
          </p>
        </div>

        <div className="mk-two">
          <div className="mk-panel mk-panel-logos">
            <h3 className="mk-panel-title">Supported blockchains</h3>
            <div className="logo-row">
              {CHAINS.map((c) => (
                <LogoTile key={c.file} dir="chains" file={c.file} label={c.name} />
              ))}
            </div>
          </div>

          <div className="mk-panel mk-panel-logos">
            <h3 className="mk-panel-title">Native wallet support</h3>
            <div className="logo-row">
              {WALLETS.map((w) => (
                <LogoTile key={w.file} dir="wallets" file={w.file} label={w.name} />
              ))}
            </div>
          </div>
        </div>

        <a className="mk-ccip" href="https://chain.link/" target="_blank" rel="noreferrer"
           data-testid="link-chainlink-badge">
          <img src="/brand/chainlink-ccip.png" alt="Chainlink CCIP" />
          <p>
            Resolution runs through an ENSIP-10 wildcard resolver and a CCIP-Read gateway, so one
            name answers on every supported chain without a separate registry per network.
          </p>
        </a>
      </section>

      {/* ── Infrastructure only ── */}
      <section className="l-section mk-section">
        <div className="l-section-head mk-head-center">
          <h2 className="display-2 mk-h2">Infrastructure <span className="dim">only.</span></h2>
          <p className="l-section-lede">
            RWA-ID operates with minimal regulatory surface area. We provide the rails — your
            existing compliance stack stays untouched.
          </p>
        </div>

        <div className="mk-scope">
          <div className="mk-scope-col">
            <span className="mono-label">What RWA-ID does</span>
            <ul>
              {DOES.map((d) => <li key={d}><Check />{d}</li>)}
            </ul>
          </div>
          <div className="mk-scope-col is-not">
            <span className="mono-label">What RWA-ID does not do</span>
            <ul>
              {DOES_NOT.map((d) => <li key={d}><span className="mk-scope-dash" />{d}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="l-section mk-section" id="contact">
        <div className="l-section-head mk-head-center">
          <h2 className="display-2 mk-h2">Get in <span className="dim">touch.</span></h2>
          <p className="l-section-lede">
            Interested in integrating RWA-ID into your platform? Whether it's a partnership, a demo
            request, a collaboration or just a question — we'd love to hear from you.
          </p>
        </div>

        {contactResult === "success" ? (
          <div className="mk-form">
            <div className="mk-form-sent">
              <span className="mk-form-sent-mark"><Check size={24} /></span>
              <h3 className="l-card-title">Message sent</h3>
              <p className="body">Thanks for reaching out. We'll get back to you at the email you provided.</p>
              <button className="btn btn-lg hero-ghost" onClick={() => setContactResult("idle")}
                      data-testid="button-send-another">
                Send another message
              </button>
            </div>
          </div>
        ) : (
          <form className="mk-form" onSubmit={handleContactSubmit}>
            <div className="mk-form-grid">
              <div className="field">
                <label className="label" htmlFor="c-name">Name <span className="req">*</span></label>
                <div className="input-shell">
                  <input id="c-name" name="name" type="text" placeholder="Jane Smith" required
                         data-testid="input-contact-name" />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="c-email">Email <span className="req">*</span></label>
                <div className="input-shell">
                  <input id="c-email" name="email" type="email" placeholder="jane@yourplatform.com" required
                         data-testid="input-contact-email" />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="c-org">
                  Organization <span className="label-note">optional</span>
                </label>
                <div className="input-shell">
                  <input id="c-org" name="organization" type="text" placeholder="Your platform or company" />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="c-type">Inquiry type <span className="req">*</span></label>
                <div className="input-shell is-select">
                  <select id="c-type" name="inquiry_type" required value={inquiryType}
                          onChange={(e) => setInquiryType(e.target.value)}
                          data-testid="select-contact-type">
                    <option value="" disabled>Select inquiry type</option>
                    <option>Partnership</option>
                    <option>Demo Request</option>
                    <option>Collaboration</option>
                    <option>Integration Support</option>
                    <option>General Question</option>
                  </select>
                </div>
              </div>

              <div className="field full">
                <label className="label" htmlFor="c-msg">Message <span className="req">*</span></label>
                <div className="input-shell">
                  <textarea id="c-msg" name="message" rows={5} required
                            placeholder="Tell us about your platform and how you'd like to work together…"
                            data-testid="textarea-contact-message" />
                </div>
              </div>
            </div>

            {contactResult === "error" && (
              <p className="hint hint-danger" data-testid="text-contact-error">
                That didn't send. Try again, or email {CONTACT_EMAIL} directly.
              </p>
            )}

            <div className="mk-form-foot">
              <span className="mk-form-note">
                Or email us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
              <button className="btn btn-accent btn-lg" type="submit"
                      disabled={contactResult === "sending" || !inquiryType}
                      data-testid="button-submit-contact">
                {contactResult === "sending" ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Closing CTA ── */}
      <section className="l-cta">
        <div className="mono-label" style={{ marginBottom: 16 }}>Ready when your compliance team is</div>
        <h2 className="display-2 mk-h2">Issue your first<br /><span className="dim">institutional identity.</span></h2>
        <div className="row row-wrap" style={{ justifyContent: "center", marginTop: 30 }}>
          <a className="btn btn-accent btn-lg" href={DASHBOARD_URL} target="_blank" rel="noreferrer">Launch Dashboard</a>
          <a className="btn btn-lg hero-ghost" href="#faq">How it works</a>
          <a className="btn btn-lg hero-ghost" href="#contact">Book a walkthrough</a>
        </div>
      </section>

      {/* ── Contract bar ── */}
      <div className="mk-contract">
        <span className="mk-contract-net">
          <img src="/brand/chains/ethereum.svg" alt="" />Ethereum Mainnet
        </span>
        <button className={`mk-contract-addr${copied ? " is-copied" : ""}`} onClick={copyAddress}
                data-testid="button-copy-contract">
          0x6413…A2C7
          {copied ? <Check size={13} /> : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
        <a href={EXPLORER_URL} target="_blank" rel="noreferrer" data-testid="link-explorer">View on Explorer ↗</a>
        <span>Supports millions of claims</span>
      </div>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-top">
          <div className="l-footer-brand">
            <div className="l-brand">
              <span className="l-brand-mark">R</span>
              <span className="l-brand-word">RWA&middot;ID</span>
            </div>
            <p className="l-footer-tag">
              Identity infrastructure for regulated onchain finance. Non-custodial, ENS-native, live
              on Ethereum mainnet.
            </p>
            <a className="l-social" href={X_URL} target="_blank" rel="noreferrer" data-testid="link-x">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {X_HANDLE}
            </a>
          </div>

          <div className="l-footer-cols">
            <div className="l-footer-col">
              <div className="l-footer-col-head">Protocol</div>
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer">Registry contract</a>
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer">Verified source</a>
              <a href="https://etherscan.io/" target="_blank" rel="noreferrer">Explorer</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Developers</div>
              <a href="https://github.com/RWA-ID" target="_blank" rel="noreferrer" data-testid="link-github">GitHub</a>
              <a href="https://docs.ens.domains/ensip/10" target="_blank" rel="noreferrer">ENSIP-10 wildcard</a>
              <a href="https://chain.link/" target="_blank" rel="noreferrer">Chainlink CCIP</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Legal</div>
              <a href="/privacy" data-testid="link-privacy">Privacy policy</a>
            </div>
            <div className="l-footer-col">
              <div className="l-footer-col-head">Company</div>
              <a href="#faq">How it works</a>
              <a href="#contact">Book a walkthrough</a>
              <a href={X_URL} target="_blank" rel="noreferrer">{X_HANDLE} on X</a>
              <a href={`mailto:${CONTACT_EMAIL}`} data-testid="link-contact-email">{CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>

        <div className="l-footer-bottom">
          <span>© {new Date().getFullYear()} RWA-ID Labs</span>
          <div className="l-footer-bottom-right">
            <a href="/privacy">Privacy</a>
            <a href={EXPLORER_URL} target="_blank" rel="noreferrer">0x6413…A2C7</a>
            <span>rwa-id.eth</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
