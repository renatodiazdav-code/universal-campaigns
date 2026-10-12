"use client";

import { useState } from "react";

export default function StartShopify() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function start(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/shopify/onboarding/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start with Shopify.");
      window.location.assign(data.authorizationUrl);
    } catch (error) { setError(error.message); setBusy(false); }
  }
  return <form onSubmit={start} className="shopifyStart">
    <label className="field"><span>Your Shopify store address</span>
      <input value={shop} onChange={(event) => setShop(event.target.value)} placeholder="your-store.myshopify.com" maxLength="200" required /></label>
    <button type="submit" disabled={busy}>{busy ? "Opening Shopify…" : "Continue with Shopify →"}</button>
    {error && <p role="alert" className="errorText">{error}</p>}
  </form>;
}
