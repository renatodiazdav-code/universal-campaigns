import Link from "next/link";
import StartShopify from "./StartShopify";
export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <strong className="logo">Relay</strong>

        <Link href="/login" className="secondaryButton">Log in</Link>
      </header>

      <section className="hero">
        <p className="eyebrow">BUILT FOR SHOPIFY STORES</p>

        <h1>
          Your Shopify products.
          <br />
          Ads on Meta. TikTok is next.
        </h1>

        <p className="subtitle">
          Connect your store, choose a product, and build one campaign for your ad platforms.
        </p>

        <StartShopify />
        <p className="reviewDescription">Already use Relay? <Link href="/login">Log in</Link></p>
      </section>

      <section className="platforms">
        <span>Shopify</span>
        <span>→</span>
        <strong>Relay</strong>
        <span>→</span>
        <span>Meta</span>
        <span>+</span>
        <span>TikTok · coming soon</span>
      </section>
    </main>
  );
}
