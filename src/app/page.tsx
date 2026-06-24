import Link from "next/link";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import { FileText, Layers, Zap, ShieldCheck, ArrowRight } from "lucide-react";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"] });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"] });

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      style={{
        background: "#FBF8F2",
        borderBottom: "1px solid #E8E2D9",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={20} color="#1F6F54" />
          <span
            className={sourceSerif.className}
            style={{ fontSize: 18, fontWeight: 600, color: "#1C2127" }}
          >
            LegalTech
          </span>
        </div>

        <Link
          href="/login"
          className={inter.className}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#1C2127",
            border: "1px solid #C9C2B4",
            borderRadius: 7,
            padding: "6px 16px",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        background: "#FBF8F2",
        padding: "88px 24px 80px",
        textAlign: "center",
        borderBottom: "1px solid #E8E2D9",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <p
          className={inter.className}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#1F6F54",
            marginBottom: 20,
          }}
        >
          Legal intake, automated
        </p>

        <h1
          className={sourceSerif.className}
          style={{
            fontSize: "clamp(36px, 5vw, 54px)",
            fontWeight: 700,
            lineHeight: 1.12,
            color: "#1C2127",
            marginBottom: 22,
            letterSpacing: "-0.01em",
          }}
        >
          Legal intake forms that work everywhere you do
        </h1>

        <p
          className={inter.className}
          style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: "#6B7280",
            maxWidth: 520,
            margin: "0 auto 40px",
          }}
        >
          Build once. Embed anywhere. Receive signed, verified submissions
          instantly.
        </p>

        <Link
          href="/login"
          className={inter.className}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#1F6F54",
            color: "#FBF8F2",
            fontSize: 15,
            fontWeight: 600,
            padding: "13px 28px",
            borderRadius: 9,
            textDecoration: "none",
          }}
        >
          Start building <ArrowRight size={16} />
        </Link>

        <p
          className={inter.className}
          style={{ fontSize: 12, color: "#A89F8C", marginTop: 18 }}
        >
          Used by law firms to automate client intake
        </p>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Layers size={22} color="#1F6F54" />,
    title: "No-code builder",
    desc: "Add fields, customize themes, preview live. No developer needed.",
  },
  {
    icon: <Zap size={22} color="#1F6F54" />,
    title: "Instant everywhere",
    desc: "Change your form once. It updates on every embedded site on the next page load.",
  },
  {
    icon: <ShieldCheck size={22} color="#1F6F54" />,
    title: "Signed & verified",
    desc: "Every submission arrives with an HMAC-SHA256 signature your backend can verify.",
  },
];

function Features() {
  return (
    <section
      style={{
        background: "#F3F1EC",
        padding: "72px 24px",
        borderBottom: "1px solid #E8E2D9",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <p
          className={inter.className}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8A8270",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          Why LegalTech
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#FBF8F2",
                border: "1px solid #C9C2B4",
                borderRadius: 12,
                padding: "28px 24px",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  background: "#E6F0EA",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>
              <h3
                className={sourceSerif.className}
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1C2127",
                  marginBottom: 8,
                }}
              >
                {f.title}
              </h3>
              <p
                className={inter.className}
                style={{ fontSize: 14, lineHeight: 1.6, color: "#6B7280" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "1",
    title: "Build your workflow in the dashboard",
    desc: "Use the drag-and-drop builder to add fields, set themes, and preview the form live.",
  },
  {
    n: "2",
    title: "Copy one script tag to your website",
    desc: "Paste a single line of HTML anywhere on your site. No npm, no build step.",
  },
  {
    n: "3",
    title: "Receive verified submissions instantly",
    desc: "Every submission is stored in your dashboard and delivered to your webhook, signed.",
  },
];

function HowItWorks() {
  return (
    <section style={{ background: "#FBF8F2", padding: "72px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p
          className={inter.className}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8A8270",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          How it works
        </p>
        <h2
          className={sourceSerif.className}
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: "#1C2127",
            textAlign: "center",
            marginBottom: 52,
          }}
        >
          From builder to embedded form in minutes
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              style={{
                display: "flex",
                gap: 20,
                paddingBottom: i < STEPS.length - 1 ? 36 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  className={ibmMono.className}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#1F6F54",
                    color: "#FBF8F2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      background: "#C9C2B4",
                      marginTop: 8,
                      minHeight: 28,
                    }}
                  />
                )}
              </div>

              <div style={{ paddingTop: 6 }}>
                <h3
                  className={sourceSerif.className}
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1C2127",
                    marginBottom: 6,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className={inter.className}
                  style={{ fontSize: 14, lineHeight: 1.65, color: "#6B7280" }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Code preview ─────────────────────────────────────────────────────────────

function CodePreview() {
  const snippet = `<script
  src="https://app.legalform.io/embed.js"
  data-workflow-id="wf_company_8x2k"
  async
></script>`;

  return (
    <section
      style={{
        background: "#F3F1EC",
        padding: "72px 24px",
        borderTop: "1px solid #E8E2D9",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <p
          className={inter.className}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8A8270",
            marginBottom: 20,
          }}
        >
          One line of code
        </p>
        <h2
          className={sourceSerif.className}
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "#1C2127",
            marginBottom: 32,
          }}
        >
          Add your form with a single script tag
        </h2>

        <div
          style={{
            background: "#1C2127",
            borderRadius: 10,
            padding: "20px 24px",
            textAlign: "left",
            marginBottom: 16,
          }}
        >
          <pre
            className={ibmMono.className}
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: "#86EFAC",
              margin: 0,
              whiteSpace: "pre",
              overflowX: "auto",
            }}
          >
            {snippet}
          </pre>
        </div>

        <p
          className={inter.className}
          style={{ fontSize: 13, color: "#8A8270" }}
        >
          That&apos;s all your client needs on their site
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "#1C2127", padding: "32px 24px" }}>
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={16} color="#4CAF82" />
          <span
            className={sourceSerif.className}
            style={{ fontSize: 14, fontWeight: 600, color: "#FBF8F2" }}
          >
            LegalTech
          </span>
          <span
            className={inter.className}
            style={{ fontSize: 12, color: "#6B7280" }}
          >
            © 2026
          </span>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <Link
            href="/login"
            className={inter.className}
            style={{ fontSize: 13, color: "#8A8270", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <span
            className={inter.className}
            style={{ fontSize: 13, color: "#8A8270" }}
          >
            Documentation
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: "#FBF8F2", minHeight: "100vh" }}>
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <CodePreview />
      <Footer />
    </div>
  );
}
