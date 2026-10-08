"use client";

import { useEffect, useState } from "react";

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
    total: 100,
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
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState("");
  const [creatingMetaCampaign, setCreatingMetaCampaign] = useState(false);
  const [metaCampaignResult, setMetaCampaignResult] = useState(null);
  const [metaCampaignError, setMetaCampaignError] = useState("");
  const [metaSetup, setMetaSetup] = useState(null);
  const [metaSetupLoading, setMetaSetupLoading] = useState(true);
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

        setMetaSetup({
          status: "ERROR",
        });
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

        setProducts(data.products);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const hasSelectedPlatform = platforms.meta || platforms.tiktok;

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || null;

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
        ? budget.total
        : budget.meta;

  const expectedTikTokBudget =
    !platforms.tiktok
      ? 0
      : !platforms.meta
        ? budget.total
        : budget.tiktok;


  const budgetIsValid =
    budget.total > 0 &&
    budget.durationDays > 0 &&
    expectedMetaBudget + expectedTikTokBudget === budget.total;

  async function generateCampaignPlan() {
    if (!selectedProduct) {
      return;
    }

    setGeneratingPlan(true);
    setPlanError("");

    try {
      const campaignInput = {
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
          ageMin: audience.ageMin,
          ageMax: audience.ageMax,
          gender: audience.gender,
        },

        budget: {
          total: budget.total,
          currency: selectedProduct.currency,
          durationDays: budget.durationDays,

          allocation: {
            mode: "MANUAL",
            meta: platforms.meta ? expectedMetaBudget : 0,
            tiktok: platforms.tiktok ? expectedTikTokBudget : 0,
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
    if (!selectedProduct) {
      return;
    }

    setLaunchingCampaign(true);
    setLaunchError("");
    setLaunchResult(null);

    try {
      const campaignInput = {
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
          ageMin: audience.ageMin,
          ageMax: audience.ageMax,
          gender: audience.gender,
        },

        budget: {
          total: budget.total,
          currency: selectedProduct.currency,
          durationDays: budget.durationDays,

          allocation: {
            mode: "MANUAL",
            meta: platforms.meta ? expectedMetaBudget : 0,
            tiktok: platforms.tiktok ? expectedTikTokBudget : 0,
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

  async function createMetaSandboxCampaign() {
    if (!planResult?.plans?.meta) {
      return;
    }

    setCreatingMetaCampaign(true);
    setMetaCampaignError("");

    try {
      const response = await fetch("/api/meta/sandbox-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metaPlan: planResult.plans.meta,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create Meta sandbox campaign"
        );
      }

      setMetaCampaignResult(data.campaign);
    } catch (error) {
      setMetaCampaignError(error.message);
    } finally {
      setCreatingMetaCampaign(false);
    }
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
            <p className="eyebrow">
              CREATE CAMPAIGN
            </p>

            <h1 className="campaignTitle">
              What do you want to advertise?
            </h1>

            <p className="campaignSubtitle">
              Choose a product from your Shopify store.
            </p>

            {loading && (
              <p className="loadingText">
                Loading Shopify products...
              </p>
            )}

            {error && (
              <p className="errorText">
                {error}
              </p>
            )}

            <div className="productGrid">
              {products.map((product) => {
                const selected =
                  selectedProductId === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`productCard ${selected ? "selected" : ""
                      }`}
                    onClick={() =>
                      setSelectedProductId(product.id)
                    }
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="productImage"
                      />
                    )}

                    <div className="productInfo">
                      <strong>
                        {product.title}
                      </strong>

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
              <a
                href="/"
                className="secondaryButton"
              >
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
            <p className="eyebrow">
              CREATE CAMPAIGN
            </p>

            <h1 className="campaignTitle">
              Where do you want to advertise?
            </h1>

            <p className="campaignSubtitle">
              Choose the platforms where this campaign will run.
            </p>

            <div className="connectionStatus">
              <div>
                <span className="connectionLabel">
                  META ACCOUNT
                </span>

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
                <div className="connectionDot connected">
                  ✓
                </div>
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
                className={`platformCard ${platforms.meta ? "selected" : ""
                  }`}
                onClick={() => {
                  if (metaSetup?.status !== "READY") {
                    return;
                  }

                  setPlatforms((current) => ({
                    ...current,
                    meta: !current.meta,
                    facebook: !current.meta,
                    instagram: !current.meta,
                  }));
                }}
              >
                <div>
                  <strong>Meta</strong>
                  <span>
                    {metaSetupLoading
                      ? "Checking connection..."
                      : metaSetup?.status === "READY"
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
                className={`platformCard ${platforms.tiktok ? "selected" : ""
                  }`}
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

            <h1 className="campaignTitle">
              Audience and budget
            </h1>

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

              <div className="fieldRow">
                <label className="field">
                  <span>Total budget (PEN)</span>

                  <input
                    type="number"
                    min="1"
                    value={budget.total}
                    onChange={(event) =>
                      setBudget((current) => ({
                        ...current,
                        total: Number(event.target.value),
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

              {platforms.meta && platforms.tiktok && (
                <div className="fieldRow">
                  <label className="field">
                    <span>Meta budget (PEN)</span>

                    <input
                      type="number"
                      min="0"
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
                    <span>TikTok budget (PEN)</span>

                    <input
                      type="number"
                      min="0"
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
                  Meta will receive the full campaign budget.
                </p>
              )}

              {!platforms.meta && platforms.tiktok && (
                <p className="allocationText">
                  TikTok will receive the full campaign budget.
                </p>
              )}
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
                disabled={!budgetIsValid}
                onClick={() => setStep(4)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="eyebrow">
              CREATE CAMPAIGN
            </p>

            <h1 className="campaignTitle">
              Create your ad
            </h1>

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
                  <span className="creativeLabel">
                    AD PREVIEW
                  </span>

                  <strong>
                    {creative.headline || selectedProduct.title}
                  </strong>

                  <p>
                    {creative.primaryText}
                  </p>
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
                  placeholder="https://your-store.com/products/..."
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
            <p className="eyebrow">
              CREATE CAMPAIGN
            </p>

            <h1 className="campaignTitle">
              Review your campaign
            </h1>

            <p className="campaignSubtitle">
              Check everything before Relay generates the platform plans.
            </p>

            <div className="reviewSection">
              <h2>Product</h2>

              {selectedProduct && (
                <div className="reviewRow">
                  <span>{selectedProduct.title}</span>
                  <strong>
                    {selectedProduct.currency} {selectedProduct.price}
                  </strong>
                </div>
              )}
            </div>

            <div className="reviewSection">
              <h2>Platforms</h2>

              <div className="reviewRow">
                <span>Meta</span>
                <strong>
                  {platforms.meta ? "Enabled" : "Disabled"}
                </strong>
              </div>

              <div className="reviewRow">
                <span>TikTok</span>
                <strong>
                  {platforms.tiktok ? "Enabled" : "Disabled"}
                </strong>
              </div>
            </div>

            <div className="reviewSection">
              <h2>Audience</h2>

              <div className="reviewRow">
                <span>Country</span>
                <strong>{audience.country}</strong>
              </div>

              <div className="reviewRow">
                <span>Age</span>
                <strong>
                  {audience.ageMin}–{audience.ageMax}
                </strong>
              </div>

              <div className="reviewRow">
                <span>Gender</span>
                <strong>{audience.gender}</strong>
              </div>
            </div>

            <div className="reviewSection">
              <h2>Budget</h2>

              <div className="reviewRow">
                <span>Total</span>
                <strong>
                  PEN {budget.total}
                </strong>
              </div>

              <div className="reviewRow">
                <span>Duration</span>
                <strong>
                  {budget.durationDays} days
                </strong>
              </div>

              {platforms.meta && (
                <div className="reviewRow">
                  <span>Meta</span>
                  <strong>
                    PEN {expectedMetaBudget}
                  </strong>
                </div>
              )}

              {platforms.tiktok && (
                <div className="reviewRow">
                  <span>TikTok</span>
                  <strong>
                    PEN {expectedTikTokBudget}
                  </strong>
                </div>
              )}
            </div>

            <div className="reviewSection">
              <h2>Creative</h2>

              <div className="reviewRow">
                <span>Headline</span>
                <strong>
                  {creative.headline}
                </strong>
              </div>

              <div className="reviewRow">
                <span>Primary text</span>
                <strong>
                  {creative.primaryText}
                </strong>
              </div>

              <div className="reviewRow reviewUrlRow">
                <span>Destination</span>
                <strong>
                  {creative.destinationUrl}
                </strong>
              </div>
            </div>

            <div className="reviewSection">
              <h2>Relay configuration</h2>

              <p className="reviewDescription">
                Relay will translate this campaign into the native
                configuration required by each selected ad platform.
              </p>
            </div>


            {planError && (
              <p className="errorText">
                {planError}
              </p>
            )}

            {planResult && (
              <div className="reviewSection">
                <h2>Campaign plan generated</h2>

                <p className="reviewDescription">
                  Relay successfully translated your Universal Campaign into
                  platform-specific plans.
                </p>

                <div className="generatedPlans">
                  {planResult.plans.meta && (
                    <div className="generatedPlanCard">
                      <div className="generatedPlanHeader">
                        <div>
                          <span className="generatedPlanLabel">META</span>
                          <h3>Meta campaign plan</h3>
                        </div>

                        <strong>
                          {planResult.plans.meta.budget.currency}{" "}
                          {planResult.plans.meta.budget.allocated}
                        </strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Objective</span>
                        <strong>{planResult.plans.meta.campaign.objective}</strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Audience</span>
                        <strong>
                          {planResult.plans.meta.audience.countries.join(", ")} ·{" "}
                          {planResult.plans.meta.audience.ageMin}–
                          {planResult.plans.meta.audience.ageMax} ·{" "}
                          {planResult.plans.meta.audience.gender}
                        </strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Placements</span>
                        <strong>
                          {planResult.plans.meta.placements.join(" + ")}
                        </strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Creative</span>
                        <strong>{planResult.plans.meta.creative.headline}</strong>
                      </div>
                    </div>
                  )}

                  {planResult.plans.tiktok && (
                    <div className="generatedPlanCard">
                      <div className="generatedPlanHeader">
                        <div>
                          <span className="generatedPlanLabel">TIKTOK</span>
                          <h3>TikTok campaign plan</h3>
                        </div>

                        <strong>
                          {planResult.plans.tiktok.budget.currency}{" "}
                          {planResult.plans.tiktok.budget.allocated}
                        </strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Objective</span>
                        <strong>{planResult.plans.tiktok.campaign.objective}</strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Audience</span>
                        <strong>
                          {planResult.plans.tiktok.audience.countries.join(", ")} ·{" "}
                          {planResult.plans.tiktok.audience.ageMin}–
                          {planResult.plans.tiktok.audience.ageMax} ·{" "}
                          {planResult.plans.tiktok.audience.gender}
                        </strong>
                      </div>

                      <div className="generatedPlanRow">
                        <span>Creative</span>
                        <strong>{planResult.plans.tiktok.creative.headline}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {planResult.plans.meta && (
                  <div className="sandboxAction">
                    <button
                      type="button"
                      className="continueButton"
                      onClick={createMetaSandboxCampaign}
                      disabled={
                        creatingMetaCampaign ||
                        !!metaCampaignResult
                      }
                    >
                      {creatingMetaCampaign
                        ? "Creating Meta sandbox campaign..."
                        : metaCampaignResult
                          ? "Meta sandbox campaign created"
                          : "Create Meta sandbox campaign"}
                    </button>

                    <p className="sandboxNote">
                      Creates a PAUSED campaign in the Relay Meta sandbox.
                      No real ad spend.
                    </p>
                  </div>
                )}

                {metaCampaignError && (
                  <p className="errorText">
                    {metaCampaignError}
                  </p>
                )}

                {metaCampaignResult && (
                  <div className="reviewSection">
                    <h2>Meta sandbox campaign created</h2>

                    <div className="reviewRow">
                      <span>ID</span>
                      <strong>{metaCampaignResult.id}</strong>
                    </div>

                    <div className="reviewRow">
                      <span>Name</span>
                      <strong>{metaCampaignResult.name}</strong>
                    </div>

                    <div className="reviewRow">
                      <span>Status</span>
                      <strong>{metaCampaignResult.status}</strong>
                    </div>

                    <div className="reviewRow">
                      <span>Objective</span>
                      <strong>{metaCampaignResult.objective}</strong>
                    </div>
                  </div>
                )}

              </div>
            )}

            {launchError && (
              <p className="errorText">
                {launchError}
              </p>
            )}

            {launchResult && (
              <div className="reviewSection">
                <h2>Campaign created</h2>

                <p className="reviewDescription">
                  Relay successfully created your Meta campaign.
                  Everything remains paused, so no ad spend is active.
                </p>

                <div className="reviewRow">
                  <span>Campaign</span>
                  <strong>
                    {launchResult.platforms.meta.campaign.id}
                  </strong>
                </div>

                <div className="reviewRow">
                  <span>Ad set</span>
                  <strong>
                    {launchResult.platforms.meta.adSet.id}
                  </strong>
                </div>

                <div className="reviewRow">
                  <span>Creative</span>
                  <strong>
                    {launchResult.platforms.meta.creative.id}
                  </strong>
                </div>

                <div className="reviewRow">
                  <span>Ad</span>
                  <strong>
                    {launchResult.platforms.meta.ad.id}
                  </strong>
                </div>

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

              <button
                type="button"
                className="continueButton"
                onClick={launchCampaign}
                disabled={
                  launchingCampaign ||
                  !!launchResult ||
                  !platforms.meta ||
                  platforms.tiktok
                }
              >
                {launchingCampaign
                  ? "Launching..."
                  : launchResult
                    ? "Campaign created"
                    : "Launch ad"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}