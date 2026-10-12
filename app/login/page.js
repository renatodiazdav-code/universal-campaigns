"use client";

import { useState } from "react";
import StartShopify from "../StartShopify";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      window.location.assign("/campaigns");
    } catch (error) { setError(error.message); setBusy(false); }
  }
  return (
    <main className="campaignPage">
      <header className="campaignHeader"><a className="logo" href="/">Relay</a></header>
      <section className="campaignContent">
        <h1 className="campaignTitle">{mode === "register" ? "Create your account" : "Sign in"}</h1>
        <p className="campaignSubtitle">Started with Shopify? Enter your store to sign in again.</p>
        <StartShopify />
        <p className="reviewDescription">Or use your Relay email and password:</p>
        <form onSubmit={submit} className="formSection">
          {mode === "register" && <label className="field"><span>Name</span><input name="name" autoComplete="name" maxLength="100" required /></label>}
          <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
          <label className="field"><span>Password</span><input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} maxLength="128" required /></label>
          {mode === "register" && <p className="reviewDescription">Use at least 12 characters.</p>}
          {error && <p role="alert" className="errorText">{error}</p>}
          <div className="campaignActions">
            <button type="button" className="stepBackButton" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "I already have an account"}</button>
            <button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
