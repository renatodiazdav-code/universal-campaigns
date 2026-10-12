"use client";

import { useEffect, useState } from "react";

export default function ConnectedAccounts() {
  const [connections, setConnections] = useState(null);
  const [pixelSetup, setPixelSetup] = useState(null);
  const [selectingPixel, setSelectingPixel] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/connections", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load connections.");
        setConnections(data.connections);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });

    fetch("/api/meta/setup/inspect", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return;
        const data = await response.json();
        if (response.ok) setPixelSetup(data.tracking?.pixel ?? null);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  async function selectPixel(pixelId) {
    if (!pixelId) return;
    setSelectingPixel(true);
    setError("");

    try {
      const response = await fetch("/api/meta/pixel/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not select the Meta Pixel/Dataset.");
      }
      setPixelSetup(data.snapshot?.tracking?.pixel ?? null);
    } catch (error) {
      setError(error.message);
    } finally {
      setSelectingPixel(false);
    }
  }

  return (
    <section className="reviewSection" aria-label="Connected accounts">
      <h2>Connected accounts</h2>
      {!connections && !error && <p className="reviewDescription">Loading connections…</p>}
      {connections && (
        <>
          <div className="reviewRow">
            <span>Shopify store</span>
            <strong>
              {connections.shopify.connected
                ? `${connections.shopify.name} ✓`
                : connections.shopify.status === "REAUTHORIZE_REQUIRED"
                  ? "Reconnect Shopify"
                  : <a href="/">Start with Shopify</a>}
            </strong>
          </div>
          <div className="reviewRow">
            <span>Meta Ads</span>
            {connections.meta.connected
              ? <strong>{connections.meta.name || "Connected"}</strong>
              : <a href="/api/meta/auth/start">Connect Meta</a>}
          </div>

          {connections.meta.connected && pixelSetup?.status === "READY" && (
            <div className="reviewRow">
              <span>Meta sales tracking</span>
              <strong>{pixelSetup.selected?.name || "Connected"} ✓</strong>
            </div>
          )}

          {connections.meta.connected && pixelSetup?.status === "NEEDS_SELECTION" && (
            <div className="field" style={{ marginTop: 16 }}>
              <span>Choose the Meta data source for this store</span>
              <select
                defaultValue=""
                disabled={selectingPixel}
                onChange={(event) => selectPixel(event.target.value)}
              >
                <option value="" disabled>Choose a Pixel/Dataset</option>
                {(pixelSetup.pixels || []).map((pixel) => (
                  <option key={pixel.id} value={pixel.id}>
                    {pixel.name || "Unnamed Pixel/Dataset"}
                  </option>
                ))}
              </select>
              <p className="reviewDescription">
                Relay uses this to measure purchases from your Shopify store.
              </p>
            </div>
          )}

          {connections.meta.connected && pixelSetup?.status === "NONE_FOUND" && (
            <p className="errorText">
              Meta did not return a Pixel/Dataset for this ad account. Connect a Meta Pixel to Shopify before creating sales campaigns.
            </p>
          )}

          <div className="reviewRow">
            <span>TikTok Ads</span>
            <strong>{connections.tiktok.connected ? "Connected" : "Not available yet"}</strong>
          </div>
        </>
      )}
      {error && <p role="alert" className="errorText">{error}</p>}
    </section>
  );
}
