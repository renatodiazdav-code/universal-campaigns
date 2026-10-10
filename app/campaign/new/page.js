"use client";

import { useEffect, useMemo, useState } from "react";

export default function NewCampaignPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [step, setStep] = useState(1);

  const [platforms, setPlatforms] = useState({
    meta: true,
    facebook: true,
    instagram: true,
    tiktok: false,
  });

  const [audience, setAudience] = useState({
    country: "PE",
    ageMin: 18,
    ageMax: 35,
    gender: "ALL",
  });

  const [budget, setBudget] = useState({
    mode: "TOTAL",
    amount: 100,
    durationDays: 7,
    meta: 60,
    tiktok: 40,
  });

  const [creative, setCreative] = useState({
    primaryText: "",
    headline: "",
    destinationUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metaSetup, setMetaSetup] = useState(null);
  const [metaSetupLoading, setMetaSetupLoading] = useState(true);

  const [budgetCompatibility, setBudgetCompatibility] = useState(null);
  const [budgetCompatibilityLoading, setBudgetCompatibilityLoading] = useState(false);
  const [budgetCompatibilityError, setBudgetCompatibilityError] = useState("");

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState("");

  const [launchingCampaign, setLaunchingCampaign] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    async function loadMetaSetup() {
      try {
        const response = await fetch("/api/meta/setup");
        const data = await response.json();

        setMetaSetup(data);

        if (data.status !== "READY") {
          setPlatforms((current) => ({
            ...current,
            meta: false,
            facebook: false,
            instagram: false,
          }));
        }
      } catch (error) {
        console.error("Could not load Meta setup:", error);
        setMetaSetup({ status: "ERROR" });
      } finally {
        setMetaSetupLoading(false);
      }
    }

    loadMetaSetup();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load products");
        }

        setProducts(data.products || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const selectedProduct = useMemo(
    () =>
      products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const currency = selectedProduct?.currency || "PEN";
  const hasSelectedPlatform = platforms.meta || platforms.tiktok;

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setCreative({
      primaryText: `Discover ${selectedProduct.title}.`,
      headline: selectedProduct.title,
      destinationUrl: selectedProduct.destinationUrl || "",
    });
  }, [selectedProduct]);

  const expectedMetaBudget =
    !platforms.meta
      ? 0
      : !platforms.tiktok
        ? budget.amount
        : budget.meta;

  const expectedTikTokBudget =
    !platforms.tiktok
      ? 0
      : !platforms.meta
        ? budget.amount
        : budget.tiktok;

  const projectedTotal =
    budget.mode === "DAILY"
      ? Number(budget.amount) * Number(budget.durationDays)
      : Number(budget.amount);

  const allocationMatches =
    Math.abs(
      expectedMetaBudget + expectedTikTokBudget - budget.amount
    ) < 0.000001;

  const basicBudgetIsValid =
    budget.amount > 0 &&
    budget.durationDays > 0 &&
    allocationMatches &&
    hasSelectedPlatform;

  function buildCampaignInput() {
    if (!selectedProduct) {
      return null;
    }

    return {
      name: `${selectedProduct.title} Campaign`,
      goal: "SALES",

      product: {
        source: "SHOPIFY",
        id: selectedProduct.id,
        title: selectedProduct.title,
        price: Number(selectedProduct.price),
        currency: selectedProduct.currency,
        imageUrl: selectedProduct.imageUrl,
        destinationUrl: selectedProduct.destinationUrl,
      },

      audience: {
        countries: [audience.country],
        ageMin: Number(audience.ageMin),
        ageMax: Number(audience.ageMax),
        gender: audience.gender,
      },

      budget: {
        mode: budget.mode,
        amount: Number(budget.amount),
        currency,
        durationDays: Number(budget.durationDays),
        allocation: {
          mode: "MANUAL",
          meta: platforms.meta ? Number(expectedMetaBudget) : 0,
          tiktok: platforms.tiktok ? Number(expectedTikTokBudget) : 0,
        },
      },

      platforms: {
        meta: {
          enabled: platforms.meta,
          facebook: platforms.meta && platforms.facebook,
          instagram: platforms.meta && platforms.instagram,
        },
        tiktok: {
          enabled: platforms.tiktok,
        },
      },

      creative: {
        type: "IMAGE",
        primaryText: creative.primaryText,
        headline: creative.headline,
        destinationUrl: creative.destinationUrl,
      },
    };
  }

  useEffect(() => {
    if (step < 3 || !selectedProduct || !hasSelectedPlatform) {
      setBudgetCompatibility(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBudgetCompatibilityLoading(true);
      setBudgetCompatibilityError("");

      try {
        const input = buildCampaignInput();

        const response = await fetch("/api/budget-compatibility", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            budget: input.budget,
            platforms: input.platforms,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not validate platform budgets"
          );
        }

        setBudgetCompatibility(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setBudgetCompatibility(null);
          setBudgetCompatibilityError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBudgetCompatibilityLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    step,
    selectedProduct,
    hasSelectedPlatform,
    platforms.meta,
    platforms.facebook,
    platforms.instagram,
    platforms.tiktok,
    audience.country,
    audience.ageMin,
    audience.ageMax,
    audience.gender,
    budget.mode,
    budget.amount,
    budget.durationDays,
    budget.meta,
    budget.tiktok,
    currency,
  ]);

  const budgetIsCompatible =
    basicBudgetIsValid &&
    !budgetCompatibilityLoading &&
    !budgetCompatibilityError &&
    budgetCompatibility?.eligible === true;

  const tiktokMinimum =
    budgetCompatibility?.platforms?.tiktok?.minimumRequired;

  async function generateCampaignPlan() {
    const campaignInput = buildCampaignInput();

    if (!campaignInput || !budgetIsCompatible) {
      return;
    }

    setGeneratingPlan(true);
    setPlanError("");
    setPlanResult(null);

    try {
      const response = await fetch("/api/campaign-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignInput),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate campaign plan");
      }

      setPlanResult(data);
    } catch (error) {
      setPlanError(error.message);
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function launchCampaign() {
    const campaignInput = buildCampaignInput();

    if (!campaignInput || !budgetIsCompatible) {
      return;
    }

    setLaunchingCampaign(true);
    setLaunchError("");
    setLaunchResult(null);

    try {
      const response = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignInput),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.platforms?.meta?.error ||
          data.error ||
          "Could not launch campaign"
        );
      }

      setLaunchResult(data);
    } catch (error) {
      setLaunchError(error.message);
    } finally {
      setLaunchingCampaign(false);
    }
  }

  function selectMetaOnly() {
    if (metaSetup?.status !== "READY") {
      return;
    }

    setPlatforms((current) => ({
      ...current,
      meta: true,
      facebook: true,
      instagram: true,
      tiktok: false,
    }));
  }

  return (
    <main className="campaignPage">
      <header className="campaignHeader">
        <a href="/" className="logo">
          Relay
        </a>

        <span className="stepLabel">
          Step {step} of 5
        </span>
      </header>

      <section className="campaignContent">
        {step === 1 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">
              What do you want to advertise?
            </h1>
            <p className="campaignSubtitle">
              Choose a product from your Shopify store.
            </p>

            {loading && (
              <p className="loadingText">Loading Shopify products...</p>
            )}

            {error && <p className="errorText">{error}</p>}

            <div className="productGrid">
              {products.map((product) => {
                const selected = selectedProductId === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`productCard ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="productImage"
                      />
                    )}

                    <div className="productInfo">
                      <strong>{product.title}</strong>
                      <span>
                        {product.currency} {product.price}
                      </span>
                    </div>

                    <div className="selectionIndicator">
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="campaignActions">
              <a href="/" className="secondaryButton">
                Back
              </a>

              <button
                type="button"
                disabled={!selectedProductId}
                className="continueButton"
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">
              Where do you want to advertise?
            </h1>
            <p className="campaignSubtitle">
              Choose the platforms where this campaign will run.
            </p>

            <div className="connectionStatus">
              <div>
                <span className="connectionLabel">META ACCOUNT</span>
                <strong>
                  {metaSetupLoading
                    ? "Checking connection..."
                    : metaSetup?.status === "READY"
                      ? "Meta connected"
                      : "Meta not connected"}
                </strong>
              </div>

              {metaSetupLoading ? (
                <div className="connectionDot" />
              ) : metaSetup?.status === "READY" ? (
                <div className="connectionDot connected">✓</div>
              ) : (
                <a
                  href="/api/meta/auth/start"
                  className="secondaryButton"
                >
                  Connect Meta
                </a>
              )}
            </div>

            <div className="platformGrid">
              <button
                disabled={metaSetup?.status !== "READY"}
                type="button"
                className={`platformCard ${platforms.meta ? "selected" : ""}`}
                onClick={() => {
                  if (metaSetup?.status !== "READY") {
                    return;
                  }

                  setPlatforms((current) => {
                    const enabled = !current.meta;
                    return {
                      ...current,
                      meta: enabled,
                      facebook: enabled,
                      instagram: enabled,
                    };
                  });
                }}
              >
                <div>
                  <strong>Meta</strong>
                  <span>
                    {metaSetup?.status === "READY"
                      ? "Facebook + Instagram"
                      : "Connect Meta first"}
                  </span>
                </div>
                <div className="selectionIndicator">
                  {platforms.meta ? "✓" : ""}
                </div>
              </button>

              <button
                type="button"
                className={`platformCard ${platforms.tiktok ? "selected" : ""}`}
                onClick={() =>
                  setPlatforms((current) => ({
                    ...current,
                    tiktok: !current.tiktok,
                  }))
                }
              >
                <div>
                  <strong>TikTok</strong>
                  <span>TikTok Ads</span>
                </div>
                <div className="selectionIndicator">
                  {platforms.tiktok ? "✓" : ""}
                </div>
              </button>
            </div>

            <div className="campaignActions">
              <button
                type="button"
                className="secondaryButton stepBackButton"
                onClick={() => setStep(1)}
              >
                Back
              </button>

              <button
                type="button"
                className="continueButton"
                disabled={!hasSelectedPlatform}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">Audience and budget</h1>
            <p className="campaignSubtitle">
              Tell Relay who you want to reach and how much you want to spend.
            </p>

            <div className="formSection">
              <h2>Audience</h2>

              <label className="field">
                <span>Country</span>
                <select
                  value={audience.country}
                  onChange={(event) =>
                    setAudience((current) => ({
                      ...current,
                      country: event.target.value,
                    }))
                  }
                >
                  <option value="PE">Peru</option>
                  <option value="US">United States</option>
                  <option value="MX">Mexico</option>
                  <option value="CO">Colombia</option>
                  <option value="CL">Chile</option>
                </select>
              </label>

              <div className="fieldRow">
                <label className="field">
                  <span>Minimum age</span>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={audience.ageMin}
                    onChange={(event) =>
                      setAudience((current) => ({
                        ...current,
                        ageMin: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Maximum age</span>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={audience.ageMax}
                    onChange={(event) =>
                      setAudience((current) => ({
                        ...current,
                        ageMax: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <label className="field">
                <span>Gender</span>
                <select
                  value={audience.gender}
                  onChange={(event) =>
                    setAudience((current) => ({
                      ...current,
                      gender: event.target.value,
                    }))
                  }
                >
                  <option value="ALL">All</option>
                  <option value="MALE">Men</option>
                  <option value="FEMALE">Women</option>
                </select>
              </label>
            </div>

            <div className="formSection">
              <h2>Budget</h2>

              <label className="field">
                <span>Budget type</span>
                <select
                  value={budget.mode}
                  onChange={(event) =>
                    setBudget((current) => ({
                      ...current,
                      mode: event.target.value,
                    }))
                  }
                >
                  <option value="TOTAL">Total budget</option>
                  <option value="DAILY">Daily budget</option>
                </select>
              </label>

              <div className="fieldRow">
                <label className="field">
                  <span>
                    {budget.mode === "DAILY"
                      ? `Daily budget (${currency}/day)`
                      : `Total budget (${currency})`}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={budget.amount}
                    onChange={(event) =>
                      setBudget((current) => ({
                        ...current,
                        amount: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Duration (days)</span>
                  <input
                    type="number"
                    min="1"
                    value={budget.durationDays}
                    onChange={(event) =>
                      setBudget((current) => ({
                        ...current,
                        durationDays: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              {budget.mode === "DAILY" && (
                <p className="allocationText">
                  Estimated spend over {budget.durationDays} day
                  {budget.durationDays === 1 ? "" : "s"}: {currency}{" "}
                  {Number(projectedTotal).toFixed(2)}. Relay will still set an
                  end date so the campaign does not run indefinitely.
                </p>
              )}

              {platforms.meta && platforms.tiktok && (
                <div className="fieldRow">
                  <label className="field">
                    <span>
                      Meta {budget.mode === "DAILY" ? "daily" : "total"}{" "}
                      budget ({currency})
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budget.meta}
                      onChange={(event) =>
                        setBudget((current) => ({
                          ...current,
                          meta: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>
                      TikTok {budget.mode === "DAILY" ? "daily" : "total"}{" "}
                      budget ({currency})
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budget.tiktok}
                      onChange={(event) =>
                        setBudget((current) => ({
                          ...current,
                          tiktok: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              {platforms.meta && !platforms.tiktok && (
                <p className="allocationText">
                  Meta will receive the full {budget.mode === "DAILY" ? "daily" : "total"}{" "}
                  campaign budget.
                </p>
              )}

              {!platforms.meta && platforms.tiktok && (
                <p className="allocationText">
                  TikTok will receive the full {budget.mode === "DAILY" ? "daily" : "total"}{" "}
                  campaign budget.
                </p>
              )}

              <div className="reviewSection">
                <h2>Platform compatibility</h2>

                {budgetCompatibilityLoading && (
                  <p className="reviewDescription">
                    Checking platform requirements...
                  </p>
                )}

                {budgetCompatibilityError && (
                  <p className="errorText">
                    {budgetCompatibilityError}
                  </p>
                )}

                {!budgetCompatibilityLoading &&
                  budgetCompatibility && (
                    <>
                      {platforms.meta && (
                        <div className="reviewRow">
                          <span>Meta</span>
                          <strong>
                            {budgetCompatibility.platforms.meta.eligible
                              ? "Ready"
                              : "Needs changes"}
                          </strong>
                        </div>
                      )}

                      {platforms.tiktok && (
                        <div className="reviewRow">
                          <span>TikTok</span>
                          <strong>
                            {budgetCompatibility.platforms.tiktok.eligible
                              ? "Ready"
                              : "Needs changes"}
                          </strong>
                        </div>
                      )}

                      {platforms.tiktok && tiktokMinimum && (
                        <div className="reviewRow">
                          <span>
                            {budget.mode === "DAILY"
                              ? "TikTok minimum per day"
                              : `TikTok minimum for ${budget.durationDays} day${budget.durationDays === 1 ? "" : "s"}`}
                          </span>
                          <strong>
                            {tiktokMinimum.currency}{" "}
                            {Number(tiktokMinimum.amount).toFixed(2)}
                            {budget.mode === "DAILY" ? "/day" : ""}
                          </strong>
                        </div>
                      )}

                      {budgetCompatibility.issues.map((issue) => (
                        <p
                          key={`${issue.platform || "RELAY"}-${issue.code}`}
                          className="errorText"
                        >
                          {issue.message}
                        </p>
                      ))}

                      {budgetCompatibility.eligible && (
                        <p className="reviewDescription">
                          This budget is compatible with every selected platform.
                        </p>
                      )}

                      {!budgetCompatibility.eligible &&
                        platforms.tiktok &&
                        platforms.meta && (
                          <button
                            type="button"
                            className="stepBackButton"
                            onClick={selectMetaOnly}
                          >
                            Use Meta only
                          </button>
                        )}
                    </>
                  )}
              </div>
            </div>

            <div className="campaignActions">
              <button
                type="button"
                className="secondaryButton stepBackButton"
                onClick={() => setStep(2)}
              >
                Back
              </button>

              <button
                type="button"
                className="continueButton"
                disabled={!budgetIsCompatible}
                onClick={() => setStep(4)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">Create your ad</h1>
            <p className="campaignSubtitle">
              Customize the message people will see.
            </p>

            {selectedProduct && (
              <div className="creativePreview">
                {selectedProduct.imageUrl && (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    className="creativeImage"
                  />
                )}

                <div className="creativePreviewContent">
                  <span className="creativeLabel">AD PREVIEW</span>
                  <strong>
                    {creative.headline || selectedProduct.title}
                  </strong>
                  <p>{creative.primaryText}</p>
                </div>
              </div>
            )}

            <div className="formSection">
              <label className="field">
                <span>Primary text</span>
                <textarea
                  rows="4"
                  value={creative.primaryText}
                  onChange={(event) =>
                    setCreative((current) => ({
                      ...current,
                      primaryText: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Headline</span>
                <input
                  type="text"
                  value={creative.headline}
                  onChange={(event) =>
                    setCreative((current) => ({
                      ...current,
                      headline: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Destination URL</span>
                <input
                  type="url"
                  value={creative.destinationUrl}
                  onChange={(event) =>
                    setCreative((current) => ({
                      ...current,
                      destinationUrl: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="campaignActions">
              <button
                type="button"
                className="secondaryButton stepBackButton"
                onClick={() => setStep(3)}
              >
                Back
              </button>

              <button
                type="button"
                className="continueButton"
                onClick={() => setStep(5)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">Review your campaign</h1>
            <p className="campaignSubtitle">
              Relay has checked the selected platforms and will translate this
              campaign into their native configuration.
            </p>

            <div className="reviewSection">
              <h2>Campaign</h2>
              <div className="reviewRow">
                <span>Product</span>
                <strong>{selectedProduct?.title || "—"}</strong>
              </div>
              <div className="reviewRow">
                <span>Platforms</span>
                <strong>
                  {[
                    platforms.meta ? "Meta" : null,
                    platforms.tiktok ? "TikTok" : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </strong>
              </div>
              <div className="reviewRow">
                <span>Budget type</span>
                <strong>
                  {budget.mode === "DAILY" ? "Daily" : "Total"}
                </strong>
              </div>
              <div className="reviewRow">
                <span>
                  {budget.mode === "DAILY" ? "Daily budget" : "Total budget"}
                </span>
                <strong>
                  {currency} {budget.amount}
                  {budget.mode === "DAILY" ? "/day" : ""}
                </strong>
              </div>
              {budget.mode === "DAILY" && (
                <div className="reviewRow">
                  <span>Estimated campaign spend</span>
                  <strong>
                    {currency} {Number(projectedTotal).toFixed(2)}
                  </strong>
                </div>
              )}
              <div className="reviewRow">
                <span>Duration</span>
                <strong>{budget.durationDays} days</strong>
              </div>
            </div>

            <div className="reviewSection">
              <h2>Budget allocation</h2>
              {platforms.meta && (
                <div className="reviewRow">
                  <span>Meta</span>
                  <strong>
                    {currency} {expectedMetaBudget}
                    {budget.mode === "DAILY" ? "/day" : ""}
                  </strong>
                </div>
              )}
              {platforms.tiktok && (
                <div className="reviewRow">
                  <span>TikTok</span>
                  <strong>
                    {currency} {expectedTikTokBudget}
                    {budget.mode === "DAILY" ? "/day" : ""}
                  </strong>
                </div>
              )}
            </div>

            {platforms.tiktok && (
              <div className="reviewSection">
                <h2>TikTok execution</h2>
                <p className="reviewDescription">
                  Budget compatibility is ready, but Relay has not connected
                  the TikTok execution API yet. We will not create or spend on
                  TikTok until that connector is implemented.
                </p>
              </div>
            )}

            {planError && <p className="errorText">{planError}</p>}

            {planResult && (
              <details className="reviewSection">
                <summary>Developer details</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    marginTop: 18,
                  }}
                >
                  {JSON.stringify(planResult.plans, null, 2)}
                </pre>
              </details>
            )}

            {launchError && <p className="errorText">{launchError}</p>}

            {launchResult && (
              <div className="reviewSection">
                <h2>Campaign created</h2>
                <p className="reviewDescription">
                  Relay created the Meta campaign in PAUSED mode. No ad spend
                  is active.
                </p>
                <div className="reviewRow">
                  <span>Status</span>
                  <strong>PAUSED</strong>
                </div>
              </div>
            )}

            <div className="campaignActions">
              <button
                type="button"
                className="secondaryButton stepBackButton"
                onClick={() => setStep(4)}
              >
                Back
              </button>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  className="secondaryButton stepBackButton"
                  onClick={generateCampaignPlan}
                  disabled={generatingPlan || !budgetIsCompatible}
                >
                  {generatingPlan ? "Checking..." : "View developer plan"}
                </button>

                <button
                  type="button"
                  className="continueButton"
                  onClick={launchCampaign}
                  disabled={
                    launchingCampaign ||
                    !!launchResult ||
                    !budgetIsCompatible ||
                    !platforms.meta ||
                    platforms.tiktok
                  }
                >
                  {launchingCampaign
                    ? "Creating..."
                    : launchResult
                      ? "Campaign created"
                      : platforms.tiktok
                        ? "TikTok execution not ready"
                        : "Create paused campaign"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
