"use client";

const COUNTRY_OPTIONS = [["PE", "Peru"], ["US", "United States"], ["MX", "Mexico"], ["CO", "Colombia"], ["CL", "Chile"]];
const CTA_OPTIONS = [["SHOP_NOW", "Shop now"], ["LEARN_MORE", "Learn more"], ["GET_OFFER", "Get offer"], ["SIGN_UP", "Sign up"]];

export function CampaignScopeTabs({ scope, onChange, platforms }) {
  return (
    <nav className="scopeTabs" aria-label="Campaign configuration">
      {[["universal", "Universal", true], ["meta", "Meta Ads", platforms.meta], ["tiktok", "TikTok Ads", platforms.tiktok]].map(([key, label, enabled]) => (
        <button key={key} type="button" className={scope === key ? "active" : ""}
          disabled={!enabled} aria-pressed={scope === key} onClick={() => onChange(key)}>{label}</button>
      ))}
    </nav>
  );
}

function Field({ label, customized, onReset, children }) {
  return (
    <div className="field">
      <div className="scopedFieldLabel">
        <label>{label}</label>
        {customized && <button type="button" className="inheritButton" onClick={onReset}>Use Universal · {label}</button>}
      </div>
      {children}
    </div>
  );
}

export function ScopedAudienceFields({ audience, scope, overrides, setAudience, setOverride }) {
  function value(key) { return Object.hasOwn(overrides, key) ? overrides[key] : key === "countries" ? [audience.country] : audience[key]; }
  function change(key, next) {
    if (scope === "universal") setAudience((current) => ({ ...current, [key === "countries" ? "country" : key]: key === "countries" ? next[0] : next }));
    else setOverride(key, next);
  }
  const props = (key, label) => ({ label, customized: scope !== "universal" && Object.hasOwn(overrides, key), onReset: () => setOverride(key, undefined) });
  return (
    <>
      <Field {...props("countries", "Country")}>
        <select aria-label="Country" value={value("countries")[0]} onChange={(event) => change("countries", [event.target.value])}>
          {COUNTRY_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </Field>
      <div className="fieldRow">
        <Field {...props("ageMin", "Minimum age")}><input aria-label="Minimum age" type="number" min="18" max="65" value={value("ageMin")} onChange={(event) => change("ageMin", event.target.value === "" ? "" : Number(event.target.value))} /></Field>
        <Field {...props("ageMax", "Maximum age")}><input aria-label="Maximum age" type="number" min="18" max="65" value={value("ageMax") ?? ""} onChange={(event) => change("ageMax", event.target.value === "" ? null : Number(event.target.value))} placeholder="No upper limit" /></Field>
      </div>
      <Field {...props("gender", "Gender")}>
        <select aria-label="Gender" value={value("gender")} onChange={(event) => change("gender", event.target.value)}>
          <option value="ALL">Everyone</option><option value="MALE">Men</option><option value="FEMALE">Women</option>
        </select>
      </Field>
    </>
  );
}

export function ScopedCreativeFields({ creative, scope, overrides, setCreative, setOverride }) {
  const value = (key) => Object.hasOwn(overrides, key) ? overrides[key] : creative[key] ?? (key === "callToAction" ? "SHOP_NOW" : "");
  function change(key, next) {
    if (scope === "universal") setCreative((current) => ({ ...current, [key]: next }));
    else setOverride(key, next);
  }
  return [["primaryText", "Primary text"], ["headline", "Headline"], ["destinationUrl", "Destination URL"], ["callToAction", "Call to action"]].map(([key, label]) => (
    <Field key={key} label={label} customized={scope !== "universal" && Object.hasOwn(overrides, key)} onReset={() => setOverride(key, undefined)}>
      {key === "primaryText" ? <textarea aria-label={label} rows="4" value={value(key)} onChange={(event) => change(key, event.target.value)} />
        : key === "callToAction" ? <select aria-label={label} value={value(key)} onChange={(event) => change(key, event.target.value)}>{CTA_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          : <input aria-label={label} type={key === "destinationUrl" ? "url" : "text"} value={value(key)} onChange={(event) => change(key, event.target.value)} />}
    </Field>
  ));
}

export function SharedAdvancedSettings({ form, onChange, currency, onReset, customized = {} }) {
  return (
    <div className="advancedPanel">
      <span className="creativeLabel">ADVANCED SETTINGS</span>
      <details className="sharedAdvancedSection">
        <summary>Audience delivery <span>{form.audienceMode === "AUTO" ? "Automatic" : "Specific audience"}</span></summary>
        <label className="field"><span>Audience delivery</span>
          <select aria-label="Audience delivery" value={form.audienceMode} onChange={(event) => onChange("audienceMode", event.target.value)}>
            <option value="AUTO">Automatic (Recommended)</option><option value="SPECIFIC">I need a specific audience</option>
          </select>
        </label>
        <p className="reviewDescription">Relay translates this choice into each platform’s supported audience settings. Expansion and restrictions can differ by platform.</p>
        {customized.audienceMode && <button type="button" className="inheritButton" onClick={() => onReset("audienceMode")}>Use Universal audience delivery</button>}
      </details>
      <details className="sharedAdvancedSection">
        <summary>Bidding <span>{form.biddingStrategy === "COST_CAP" ? "Cost per result goal" : "Highest volume"}</span></summary>
        <label className="field"><span>Bidding strategy</span>
          <select aria-label="Bidding strategy" value={form.biddingStrategy} onChange={(event) => onChange("biddingStrategy", event.target.value)}>
            <option value="LOWEST_COST">Highest volume (Recommended)</option><option value="COST_CAP">Cost per result goal</option>
          </select>
        </label>
        {form.biddingStrategy === "COST_CAP" && <label className="field"><span>Target cost per purchase ({currency})</span><input aria-label={`Target cost per purchase (${currency})`} type="number" min="0.01" step="0.01" value={form.costCap} onChange={(event) => onChange("costCap", event.target.value)} /></label>}
        {(customized.biddingStrategy || customized.costCap) && <button type="button" className="inheritButton" onClick={() => onReset("bidding")}>Use Universal bidding</button>}
      </details>
    </div>
  );
}

export function PlatformConfigurationReview({ plans, currency }) {
  if (!plans) return null;
  return (
    <>
      <div className="reviewSection">
        <h2>Platform budgets</h2>
        {Object.entries(plans).map(([key, plan]) => <div key={key} className="reviewRow"><span>{key === "meta" ? "Meta Ads" : "TikTok Ads"}</span><strong>{currency} {Number(plan.budget.allocated).toFixed(2)}{plan.budget.mode === "DAILY" ? "/day" : ""}</strong></div>)}
      </div>
      <details className="reviewSection platformConfigurationDetails">
        <summary>View how Relay is configuring your campaign</summary>
        {Object.entries(plans).map(([key, plan]) => (
    <section key={key} className="reviewSection resolvedPlatformReview" aria-label={`${key === "meta" ? "Meta" : "TikTok"} final configuration`}>
      <h2>{key === "meta" ? "Meta Ads" : "TikTok Ads"} · final configuration</h2>
      <div className="reviewRow"><span>Country</span><strong>{plan.audience.countries.join(", ")}</strong></div>
      <div className="reviewRow"><span>Age</span><strong>{plan.audience.ageMin}–{plan.audience.ageMax ?? "65+"}</strong></div>
      <div className="reviewRow"><span>Gender</span><strong>{plan.audience.gender}</strong></div>
      <div className="reviewRow"><span>Budget</span><strong>{currency} {Number(plan.budget.allocated).toFixed(2)}{plan.budget.mode === "DAILY" ? "/day" : ""}</strong></div>
      <div className="reviewRow"><span>Duration</span><strong>{plan.budget.durationDays} days</strong></div>
      <div className="reviewRow"><span>Audience delivery</span><strong>{plan.audience.mode === "SPECIFIC" ? "Specific audience" : "Automatic"}</strong></div>
      <div className="reviewRow"><span>Bidding</span><strong>{plan.bidding.strategy === "COST_CAP" ? `Cost per result goal · ${currency} ${plan.bidding.costCap}` : "Highest volume"}</strong></div>
      {key === "meta" && <>
        <div className="reviewRow"><span>Placements</span><strong>{plan.placementSettings.mode === "RECOMMENDED" ? "Relay recommended" : "Manual"}</strong></div>
        <div className="reviewRow"><span>Facebook</span><strong>{plan.placementSettings.facebook.join(", ") || "Off"}</strong></div>
        <div className="reviewRow"><span>Instagram</span><strong>{plan.placementSettings.instagram.join(", ") || "Off"}</strong></div>
        <div className="reviewRow"><span>Attribution</span><strong>{plan.attribution.mode === "AUTO" ? "Automatic" : `${plan.attribution.clickWindowDays}-day click · ${plan.attribution.viewWindowDays}-day view`}</strong></div>
      </>}
      <div className="reviewRow"><span>Primary text</span><strong>{plan.creative.primaryText || "—"}</strong></div>
      <div className="reviewRow"><span>Headline</span><strong>{plan.creative.headline || "—"}</strong></div>
      <div className="reviewRow reviewUrlRow"><span>Destination</span><strong>{plan.creative.destinationUrl || "—"}</strong></div>
      <div className="reviewRow"><span>Call to action</span><strong>{CTA_OPTIONS.find(([value]) => value === plan.creative.callToAction)?.[1] ?? plan.creative.callToAction}</strong></div>
    </section>
        ))}
      </details>
    </>
  );
}
