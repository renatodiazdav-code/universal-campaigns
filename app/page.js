import Link from "next/link";
export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <strong className="logo">Relay</strong>

        <span className="badge">
          Product Proof v0.1
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">CREATE CAMPAIGN</p>

        <h1>
          One campaign.
          <br />
          Multiple ad platforms.
        </h1>

        <p className="subtitle">
          Create a campaign once and let Relay handle the differences
          between Meta and TikTok.
        </p>

        <Link href="/campaign/new" className="primaryButton">
            Create campaign
        </Link>
      </section>

      <section className="platforms">
        <span>Shopify</span>
        <span>→</span>
        <strong>Relay</strong>
        <span>→</span>
        <span>Meta</span>
        <span>+</span>
        <span>TikTok</span>
      </section>
    </main>
  );
}