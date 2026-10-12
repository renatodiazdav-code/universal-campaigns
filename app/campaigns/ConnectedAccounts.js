"use client";

import { useEffect, useState } from "react";

export default function ConnectedAccounts() {
  const [connections, setConnections] = useState(null);
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connections", { signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { window.location.assign("/login"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load connections.");
      setConnections(data.connections);
      if (data.connections.shopify?.shop) setShop(data.connections.shopify.shop);
    }).catch((error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, []);
  async function connectShopify(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/shopify/auth/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start Shopify authorization.");
      window.location.assign(data.authorizationUrl);
    } catch (error) { setError(error.message); setBusy(false); }
  }
  async function connectDevelopmentStore() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/shopify/dev/connect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect the development store.");
      setConnections((current) => ({ ...current, shopify: { ...current.shopify, connected: true, status: "CONNECTED", name: data.store?.name || data.shop, shop: data.shop, currency: data.store?.currency || null, storefrontUrl: data.store?.storefrontUrl || null } }));
      setShop(data.shop);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return (
    <section className="reviewSection" aria-label="Connected accounts">
      <h2>Connected accounts</h2>
      {!connections && !error && <p className="reviewDescription">Loading connections…</p>}
      {connections && <>
        <div className="reviewRow"><span>Shopify</span><strong>{connections.shopify.connected ? connections.shopify.name : connections.shopify.status === "REAUTHORIZE_REQUIRED" ? "Reconnect required" : "Not connected"}</strong></div>
        <form onSubmit={connectShopify} className="formSection">
          <label className="field"><span>Shopify store address</span><input value={shop} onChange={(event) => setShop(event.target.value)} placeholder="your-store.myshopify.com" maxLength="200" required /></label>
          <button type="submit" disabled={busy}>{busy ? "Connecting…" : connections.shopify.connected ? "Reconnect Shopify" : "Connect Shopify"}</button>
        </form>
        {connections.shopify.developmentStoreAvailable && !connections.shopify.connected && <button type="button" onClick={connectDevelopmentStore} disabled={busy}>Use configured Shopify test store</button>}
        <div className="reviewRow"><span>Meta Ads</span>{connections.meta.connected ? <strong>{connections.meta.name || "Connected"}</strong> : <a href="/api/meta/auth/start">Connect Meta</a>}</div>
        <div className="reviewRow"><span>TikTok Ads</span><strong>{connections.tiktok.connected ? "Connected" : "Not available yet"}</strong></div>
      </>}
      {error && <p role="alert" className="errorText">{error}</p>}
    </section>
  );
}
