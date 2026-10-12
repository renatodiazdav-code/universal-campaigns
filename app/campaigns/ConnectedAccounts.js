"use client";

import { useEffect, useState } from "react";

export default function ConnectedAccounts() {
  const [connections, setConnections] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connections", { signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { window.location.assign("/login"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load connections.");
      setConnections(data.connections);
    }).catch((error) => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, []);
  return (
    <section className="reviewSection" aria-label="Connected accounts">
      <h2>Connected accounts</h2>
      {!connections && !error && <p className="reviewDescription">Loading connections…</p>}
      {connections && <>
        <div className="reviewRow"><span>Shopify store</span><strong>{connections.shopify.connected ? `${connections.shopify.name} ✓` : connections.shopify.status === "REAUTHORIZE_REQUIRED" ? "Reconnect Shopify" : <a href="/">Start with Shopify</a>}</strong></div>
        <div className="reviewRow"><span>Meta Ads</span>{connections.meta.connected ? <strong>{connections.meta.name || "Connected"}</strong> : <a href="/api/meta/auth/start">Connect Meta</a>}</div>
        <div className="reviewRow"><span>TikTok Ads</span><strong>{connections.tiktok.connected ? "Connected" : "Not available yet"}</strong></div>
      </>}
      {error && <p role="alert" className="errorText">{error}</p>}
    </section>
  );
}
