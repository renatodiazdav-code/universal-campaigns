"use client";

import { useEffect, useMemo, useState } from "react";
import MetaAdvancedSettings from "./MetaAdvancedSettings";
import {
  resolveEffectiveMetaPublishers,
  validateMetaAdvancedForm,
} from "../../../src/application/meta-advanced-form.mjs";

import { CampaignScopeTabs, ScopedAudienceFields, ScopedCreativeFields, SharedAdvancedSettings, PlatformConfigurationReview } from "./PlatformSettings";
import { createMetaSettingsState, resolveMetaSettingsForm, updateMetaSettingsState, buildScopedMetaOverrides, universalSettingsFromForm, combinePlatformOverrides } from "../../../src/application/platform-settings-form.mjs";
import { createUniversalCampaign } from "../../../src/domain/universal-campaign.mjs";
import { resolvePlatformConfiguration } from "../../../src/domain/platform-configuration.mjs";
import { buildPlatformPlans } from "../../../src/application/build-platform-plans.mjs";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

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

  const [allocationMode, setAllocationMode] = useState("AUTO");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scope, setScope] = useState("universal");
  const [sharedSettings, setSharedSettings] = useState({ audienceMode: "AUTO", biddingStrategy: "LOWEST_COST", costCap: "" });
  const [platformOverrides, setPlatformOverrides] = useState({ meta: {}, tiktok: {} });
  const [tiktokSettings, setTikTokSettings] = useState({});
  const [metaSettingsState, setMetaSettingsState] = useState(createMetaSettingsState);
  const metaAdvanced = resolveMetaSettingsForm(metaSettingsState, sharedSettings);
  function setMetaAdvanced(update) {
    setMetaSettingsState((current) => updateMetaSettingsState(current, update, sharedSettings));
  }
  function changePlatformField(group, key, value) {
    setPlatformOverrides((current) => {
      const fields = { ...current[scope]?.[group] };
      if (value === undefined) delete fields[key];
      else fields[key] = value;
      return { ...current, [scope]: { ...current[scope], [group]: fields } };
    });
  }
  function buildOverrides() {
    const tiktok = { ...platformOverrides.tiktok };
    if (Object.hasOwn(tiktokSettings, "audienceMode")) tiktok.audienceMode = tiktokSettings.audienceMode;
    if (Object.hasOwn(tiktokSettings, "biddingStrategy") || Object.hasOwn(tiktokSettings, "costCap")) {
      tiktok.bidding = universalSettingsFromForm({ ...sharedSettings, ...tiktokSettings }).bidding;
    }
    return {
      meta: combinePlatformOverrides(platformOverrides.meta, buildScopedMetaOverrides(metaSettingsState, sharedSettings)),
      tiktok,
    };
  }
  useEffect(() => {
    if ((scope === "meta" && !platforms.meta) || (scope === "tiktok" && !platforms.tiktok)) setScope("universal");
  }, [scope, platforms.meta, platforms.tiktok]);

  const [autoAllocation, setAutoAllocation] = useState(null);
  const [autoAllocationLoading, setAutoAllocationLoading] = useState(false);
  const [autoAllocationError, setAutoAllocationError] = useState("");

  const [budgetCompatibility, setBudgetCompatibility] = useState(null);
  const [budgetCompatibilityLoading, setBudgetCompatibilityLoading] = useState(false);
  const [budgetCompatibilityError, setBudgetCompatibilityError] = useState("");

  const [creative, setCreative] = useState({
    primaryText: "",
    headline: "",
    destinationUrl: "",
    callToAction: "SHOP_NOW",
  });
  const [creativeType, setCreativeType] = useState("IMAGE");
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageUpload, setImageUpload] = useState({
    status: "IDLE",
    imageHash: null,
    fileName: null,
    error: "",
  });
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoUpload, setVideoUpload] = useState({
    status: "IDLE",
    videoId: null,
    fileName: null,
    error: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metaSetup, setMetaSetup] = useState(null);
  const [metaSetupLoading, setMetaSetupLoading] = useState(true);

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState("");

  const [launchingCampaign, setLaunchingCampaign] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    setPlanResult(null);
    setPlanError("");
  }, [audience, creative, sharedSettings, platformOverrides, metaSettingsState, tiktokSettings, budget, platforms]);

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
        if (response.status === 401) { window.location.assign("/login"); return; }
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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const selectedProduct = useMemo(
    () =>
      products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const currency = selectedProduct?.currency || "PEN";
  const hasSelectedPlatform = platforms.meta || platforms.tiktok;
  const hasBothPlatforms = platforms.meta && platforms.tiktok;
  const canUploadMetaAsset = platforms.meta && metaSetup?.status === "READY";

  const effectiveMetaPublishers = resolveEffectiveMetaPublishers({
    metaEnabled: platforms.meta,
    facebookEnabled: platforms.facebook,
    instagramEnabled: platforms.instagram,
    form: metaAdvanced,
  });

  const metaAdvancedValidation = validateMetaAdvancedForm(metaAdvanced, {
    metaEnabled: platforms.meta,
  });

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setCreative({
      primaryText: `Discover ${selectedProduct.title}.`,
      headline: selectedProduct.title,
      destinationUrl: selectedProduct.destinationUrl || "",
      callToAction: "SHOP_NOW",
    });
    setPlatformOverrides({ meta: {}, tiktok: {} });
    setCreativeType("IMAGE");
    setImagePreviewUrl(null);
    setImageUpload({
      status: "IDLE",
      imageHash: null,
      fileName: null,
      error: "",
    });
    setVideoPreviewUrl(null);
    setVideoUpload({
      status: "IDLE",
      videoId: null,
      fileName: null,
      error: "",
    });
  }, [selectedProduct]);

  const projectedTotal =
    budget.mode === "DAILY"
      ? Number(budget.amount) * Number(budget.durationDays)
      : Number(budget.amount);

  const manualMetaBudget =
    !platforms.meta
      ? 0
      : !platforms.tiktok
        ? Number(budget.amount)
        : Number(budget.meta);

  const manualTikTokBudget =
    !platforms.tiktok
      ? 0
      : !platforms.meta
        ? Number(budget.amount)
        : Number(budget.tiktok);

  const autoMetaBudget = Number(autoAllocation?.allocation?.meta ?? 0);
  const autoTikTokBudget = Number(autoAllocation?.allocation?.tiktok ?? 0);

  const expectedMetaBudget =
    allocationMode === "AUTO" ? autoMetaBudget : manualMetaBudget;
  const expectedTikTokBudget =
    allocationMode === "AUTO" ? autoTikTokBudget : manualTikTokBudget;

  const manualAllocationMatches =
    Math.abs(
      manualMetaBudget + manualTikTokBudget - Number(budget.amount)
    ) < 0.000001;

  const basicBudgetInputIsValid =
    Number(budget.amount) > 0 &&
    Number(budget.durationDays) > 0 &&
    hasSelectedPlatform;

  const creativeIsReady =
    (creativeType === "IMAGE" &&
      imageUpload.status === "READY" &&
      Boolean(imageUpload.imageHash)) ||
    (creativeType === "VIDEO" &&
      videoUpload.status === "READY" &&
      Boolean(videoUpload.videoId));

  function buildPlatformsInput() {
    return {
      meta: effectiveMetaPublishers,
      tiktok: {
        enabled: platforms.tiktok,
      },
    };
  }

  function buildCampaignInput() {
    if (
      !selectedProduct ||
      !creativeIsReady ||
      !metaAdvancedValidation.valid
    ) {
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
        published: selectedProduct.published,
        currency: selectedProduct.currency,
        imageUrl: selectedProduct.imageUrl,
        destinationUrl: selectedProduct.destinationUrl,
      },

      settings: universalSettingsFromForm(sharedSettings),
      audience: {
        countries: [audience.country],
        ageMin: Number(audience.ageMin),
        ageMax: audience.ageMax == null ? null : Number(audience.ageMax),
        gender: audience.gender,
      },

      budget: {
        mode: budget.mode,
        amount: Number(budget.amount),
        currency,
        durationDays: Number(budget.durationDays),
        allocation: {
          mode: allocationMode,
          meta: platforms.meta ? Number(expectedMetaBudget) : 0,
          tiktok: platforms.tiktok ? Number(expectedTikTokBudget) : 0,
        },
      },

      platforms: buildPlatformsInput(),

      creative: {
        type: creativeType,
        primaryText: creative.primaryText,
        headline: creative.headline,
        callToAction: creative.callToAction,
        destinationUrl: creative.destinationUrl,
        thumbnailUrl: selectedProduct.imageUrl,
        ...(creativeType === "VIDEO" && videoUpload.videoId
          ? {
              platformAssets: {
                meta: {
                  videoId: videoUpload.videoId,
                },
              },
            }
          : creativeType === "IMAGE" && imageUpload.imageHash
            ? {
                platformAssets: {
                  meta: {
                    imageHash: imageUpload.imageHash,
                  },
                },
              }
            : {}),
      },

      overrides: buildOverrides(),
    };
  }

  useEffect(() => {
    if (
      step < 3 ||
      allocationMode !== "AUTO" ||
      !selectedProduct ||
      !hasSelectedPlatform ||
      !basicBudgetInputIsValid
    ) {
      setAutoAllocation(null);
      setAutoAllocationError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAutoAllocationLoading(true);
      setAutoAllocationError("");

      try {
        const response = await fetch("/api/budget-allocation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            budget: {
              mode: budget.mode,
              amount: Number(budget.amount),
              currency,
              durationDays: Number(budget.durationDays),
            },
            platforms: buildPlatformsInput(),
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not calculate budget distribution"
          );
        }

        setAutoAllocation(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setAutoAllocation(null);
          setAutoAllocationError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAutoAllocationLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    step,
    allocationMode,
    selectedProduct,
    hasSelectedPlatform,
    basicBudgetInputIsValid,
    platforms.meta,
    platforms.tiktok,
    effectiveMetaPublishers.facebook,
    effectiveMetaPublishers.instagram,
    budget.mode,
    budget.amount,
    budget.durationDays,
    currency,
  ]);

  useEffect(() => {
    if (
      step < 3 ||
      allocationMode !== "MANUAL" ||
      !selectedProduct ||
      !hasSelectedPlatform ||
      !basicBudgetInputIsValid ||
      !manualAllocationMatches
    ) {
      setBudgetCompatibility(null);
      setBudgetCompatibilityError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBudgetCompatibilityLoading(true);
      setBudgetCompatibilityError("");

      try {
        const response = await fetch("/api/budget-compatibility", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            budget: {
              mode: budget.mode,
              amount: Number(budget.amount),
              currency,
              durationDays: Number(budget.durationDays),
              allocation: {
                mode: "MANUAL",
                meta: manualMetaBudget,
                tiktok: manualTikTokBudget,
              },
            },
            platforms: buildPlatformsInput(),
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
    allocationMode,
    selectedProduct,
    hasSelectedPlatform,
    basicBudgetInputIsValid,
    manualAllocationMatches,
    platforms.meta,
    platforms.tiktok,
    effectiveMetaPublishers.facebook,
    effectiveMetaPublishers.instagram,
    budget.mode,
    budget.amount,
    budget.durationDays,
    budget.meta,
    budget.tiktok,
    currency,
  ]);

  const budgetIsCompatible =
    basicBudgetInputIsValid &&
    (allocationMode === "AUTO"
      ? !autoAllocationLoading &&
        !autoAllocationError &&
        autoAllocation?.eligible === true
      : manualAllocationMatches &&
        !budgetCompatibilityLoading &&
        !budgetCompatibilityError &&
        budgetCompatibility?.eligible === true);

  let configurationError = "";
  try {
    const draft = {
      audience: { countries: [audience.country], ageMin: audience.ageMin, ageMax: audience.ageMax, gender: audience.gender },
      creative,
      settings: universalSettingsFromForm(sharedSettings),
      overrides: buildOverrides(),
    };
    for (const key of ["meta", "tiktok"]) {
      if (platforms[key]) resolvePlatformConfiguration(draft, key);
    }
  } catch (error) { configurationError = error.message; }

  const canAdvanceBudget =
    budgetIsCompatible && metaAdvancedValidation.valid && !configurationError;

  let resolvedPlans = null;
  if (creativeIsReady && canAdvanceBudget) {
    try { resolvedPlans = buildPlatformPlans(createUniversalCampaign(buildCampaignInput())); }
    catch (error) { configurationError = error.message; }
  }
  const previewCreative = scope === "universal" ? creative : { ...creative, ...platformOverrides[scope]?.creative };

  const manualTikTokMinimum =
    budgetCompatibility?.platforms?.tiktok?.minimumRequired;

  function changeAllocationMode(nextMode) {
    if (nextMode === "MANUAL" && hasBothPlatforms) {
      const fallbackMeta = roundMoney(Number(budget.amount) / 2);
      const fallbackTikTok = roundMoney(
        Number(budget.amount) - fallbackMeta
      );

      setBudget((current) => ({
        ...current,
        meta: autoAllocation?.allocation?.meta ?? fallbackMeta,
        tiktok: autoAllocation?.allocation?.tiktok ?? fallbackTikTok,
      }));
    }

    setAllocationMode(nextMode);
  }

  async function uploadCreativeImage(file) {
    if (!file) {
      return;
    }

    if (!canUploadMetaAsset) {
      setImageUpload({
        status: "ERROR",
        imageHash: null,
        fileName: file.name || null,
        error: "Connect and select Meta before uploading an image.",
      });
      return;
    }

    if (
      file.type &&
      !String(file.type).toLowerCase().startsWith("image/")
    ) {
      setImageUpload({
        status: "ERROR",
        imageHash: null,
        fileName: file.name || null,
        error: "Choose an image file.",
      });
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(nextPreviewUrl);
    setImageUpload({
      status: "UPLOADING",
      imageHash: null,
      fileName: file.name || null,
      error: "",
    });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/meta/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.imageHash) {
        throw new Error(data.error || "Could not upload image to Meta");
      }

      setImageUpload({
        status: "READY",
        imageHash: String(data.imageHash),
        fileName: data.fileName || file.name || null,
        error: "",
      });
    } catch (error) {
      setImageUpload({
        status: "ERROR",
        imageHash: null,
        fileName: file.name || null,
        error: error.message,
      });
    }
  }

  async function uploadCreativeVideo(file) {
    if (!file) {
      return;
    }

    if (!canUploadMetaAsset) {
      setVideoUpload({
        status: "ERROR",
        videoId: null,
        fileName: file.name || null,
        error: "Connect and select Meta before uploading a video.",
      });
      return;
    }

    if (
      file.type &&
      !String(file.type).toLowerCase().startsWith("video/")
    ) {
      setVideoUpload({
        status: "ERROR",
        videoId: null,
        fileName: file.name || null,
        error: "Choose a video file.",
      });
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(nextPreviewUrl);
    setVideoUpload({
      status: "UPLOADING",
      videoId: null,
      fileName: file.name || null,
      error: "",
    });

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append(
        "title",
        `${selectedProduct?.title || "Relay"} - Video`
      );

      const response = await fetch("/api/meta/videos/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.videoId) {
        throw new Error(data.error || "Could not upload video to Meta");
      }

      setVideoUpload({
        status: "READY",
        videoId: String(data.videoId),
        fileName: data.fileName || file.name || null,
        error: "",
      });
    } catch (error) {
      setVideoUpload({
        status: "ERROR",
        videoId: null,
        fileName: file.name || null,
        error: error.message,
      });
    }
  }

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
    setAllocationMode("AUTO");
  }

  return (
    <main className="campaignPage">
      <header className="campaignHeader">
        <a href="/" className="logo">Relay</a>
        <span className="stepLabel">Step {step} of 5</span>
      </header>

      <section className="campaignContent">
        {step === 1 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">What do you want to advertise?</h1>
            <p className="campaignSubtitle">
              Choose a product from your Shopify store.
            </p>

            {loading && <p className="loadingText">Loading Shopify products...</p>}
            {error && <p className="errorText">{error}</p>}

            <div className="productGrid">
              {products.map((product) => {
                const selected = selectedProductId === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={product.published === false}
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
                      <span>{product.published === false ? "Publish this product on your online store first" : `${product.currency} ${product.price}`}</span>
                    </div>
                    <div className="selectionIndicator">{selected ? "✓" : ""}</div>
                  </button>
                );
              })}
            </div>

            <div className="campaignActions">
              <a href="/" className="secondaryButton">Back</a>
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
            <h1 className="campaignTitle">Where do you want to advertise?</h1>
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
                <a href="/api/meta/auth/start" className="secondaryButton">
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
                  if (metaSetup?.status !== "READY") return;
                  setPlatforms((current) => {
                    const enabled = !current.meta;
                    return {
                      ...current,
                      meta: enabled,
                      facebook: enabled,
                      instagram: enabled,
                    };
                  });
                  setAllocationMode("AUTO");
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
                <div className="selectionIndicator">{platforms.meta ? "✓" : ""}</div>
              </button>

              <button
                type="button"
                className={`platformCard ${platforms.tiktok ? "selected" : ""}`}
                onClick={() => {
                  setPlatforms((current) => ({
                    ...current,
                    tiktok: !current.tiktok,
                  }));
                  setAllocationMode("AUTO");
                }}
              >
                <div>
                  <strong>TikTok</strong>
                  <span>TikTok Ads</span>
                </div>
                <div className="selectionIndicator">{platforms.tiktok ? "✓" : ""}</div>
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

            <CampaignScopeTabs scope={scope} onChange={setScope} platforms={platforms} />
            <p className="scopeDescription">{scope === "universal" ? "Shared settings apply to every selected platform." : `${scope === "meta" ? "Facebook and Instagram" : "TikTok"} uses Universal settings until you customize a field.`}</p>
            <div className="formSection">
              <h2>Audience</h2>
              <ScopedAudienceFields audience={audience} scope={scope} overrides={platformOverrides[scope]?.audience ?? {}}
                setAudience={setAudience} setOverride={(key, value) => changePlatformField("audience", key, value)} />
            </div>
            {configurationError && <p role="alert" className="errorText">{configurationError}</p>}

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
                  {Number(projectedTotal).toFixed(2)}. Relay will set an end
                  date so the campaign does not run indefinitely.
                </p>
              )}

              <div className="reviewSection">
                <h2>Platform compatibility</h2>

                {allocationMode === "AUTO" && autoAllocationLoading && (
                  <p className="reviewDescription">
                    Relay is checking the selected platforms...
                  </p>
                )}
                {allocationMode === "AUTO" && autoAllocationError && (
                  <p className="errorText">{autoAllocationError}</p>
                )}
                {allocationMode === "AUTO" && !autoAllocationLoading && autoAllocation && (
                  <>
                    {autoAllocation.eligible ? (
                      <>
                        <div className="reviewRow">
                          <span>Budget</span>
                          <strong>Ready</strong>
                        </div>
                        <p className="reviewDescription">
                          Your budget works with the selected platforms. Relay
                          will handle the distribution automatically.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="errorText">
                          {autoAllocation.message ||
                            "This budget cannot fund the selected platforms."}
                        </p>
                        {hasBothPlatforms && (
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
                  </>
                )}

                {allocationMode === "MANUAL" && !manualAllocationMatches && (
                  <p className="errorText">
                    Meta and TikTok budgets must add up to {currency}{" "}
                    {Number(budget.amount).toFixed(2)}.
                  </p>
                )}
                {allocationMode === "MANUAL" && budgetCompatibilityLoading && (
                  <p className="reviewDescription">
                    Checking your manual distribution...
                  </p>
                )}
                {allocationMode === "MANUAL" && budgetCompatibilityError && (
                  <p className="errorText">{budgetCompatibilityError}</p>
                )}
                {allocationMode === "MANUAL" &&
                  !budgetCompatibilityLoading &&
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
                      {platforms.tiktok && manualTikTokMinimum && (
                        <div className="reviewRow">
                          <span>
                            {budget.mode === "DAILY"
                              ? "TikTok minimum per day"
                              : `TikTok minimum for ${budget.durationDays} day${budget.durationDays === 1 ? "" : "s"}`}
                          </span>
                          <strong>
                            {manualTikTokMinimum.currency}{" "}
                            {Number(manualTikTokMinimum.amount).toFixed(2)}
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
                          Your manual distribution is compatible with every
                          selected platform.
                        </p>
                      )}
                    </>
                  )}
              </div>

              {advancedOpen && scope === "universal" && (
                <>
                  <SharedAdvancedSettings form={sharedSettings} currency={currency}
                    onChange={(key, value) => setSharedSettings((current) => ({ ...current, [key]: value }))} />
                  <MetaAdvancedSettings hasBothPlatforms={hasBothPlatforms} allocationMode={allocationMode}
                    changeAllocationMode={changeAllocationMode} budget={budget} currency={currency} setBudget={setBudget}
                    metaEnabled={false} facebookEnabled={false} instagramEnabled={false} metaAdvanced={metaAdvanced}
                    setMetaAdvanced={setMetaAdvanced} validation={{ valid: true }} />
                </>
              )}
              {advancedOpen && scope === "meta" && (
                <>
                  {Object.values(metaSettingsState.customized).some(Boolean) && <button type="button" className="inheritButton" onClick={() => setMetaSettingsState(createMetaSettingsState())}>Use Universal for Meta advanced settings</button>}
                  <MetaAdvancedSettings hasBothPlatforms={false} allocationMode={allocationMode}
                    changeAllocationMode={changeAllocationMode} budget={budget} currency={currency} setBudget={setBudget}
                    showBudgetDistribution={false} metaEnabled={platforms.meta} facebookEnabled={platforms.facebook}
                    instagramEnabled={platforms.instagram} metaAdvanced={metaAdvanced} setMetaAdvanced={setMetaAdvanced}
                    validation={metaAdvancedValidation} />
                </>
              )}
              {advancedOpen && scope === "tiktok" && (
                <SharedAdvancedSettings form={{ ...sharedSettings, ...tiktokSettings }} currency={currency} customized={tiktokSettings}
                  onChange={(key, value) => setTikTokSettings((current) => {
                    const next = { ...current, [key]: value };
                    // Bidding is one setting: freeze its strategy and target together.
                    if (key === "biddingStrategy" || key === "costCap") {
                      next.biddingStrategy = key === "biddingStrategy" ? value : current.biddingStrategy ?? sharedSettings.biddingStrategy;
                      next.costCap = key === "costCap" ? value : current.costCap ?? sharedSettings.costCap;
                    }
                    return next;
                  })}
                  onReset={(key) => setTikTokSettings((current) => {
                    const next = { ...current };
                    if (key === "bidding") { delete next.biddingStrategy; delete next.costCap; }
                    else delete next[key];
                    return next;
                  })} />
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
              <div className="campaignActionRight">
                <button
                  type="button"
                  className="advancedLink"
                  onClick={() => setAdvancedOpen((current) => !current)}
                >
                  {advancedOpen
                    ? "Hide advanced settings ↑"
                    : "Advanced settings →"}
                </button>
                <button
                  type="button"
                  className="continueButton"
                  disabled={!canAdvanceBudget}
                  onClick={() => setStep(4)}
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="eyebrow">CREATE CAMPAIGN</p>
            <h1 className="campaignTitle">Create your ad</h1>
            <p className="campaignSubtitle">
              Choose an image or video, then customize the message people will see.
            </p>

            <CampaignScopeTabs scope={scope} onChange={setScope} platforms={platforms} />
            <p className="scopeDescription">{scope === "universal" ? "Upload one creative and share its message across platforms." : "Customize the message for this platform. The uploaded image or video stays shared."}</p>
            <div className="formSection">
              <h2>Creative</h2>
              <div className="platformGrid">
                <button
                  type="button"
                  disabled={!canUploadMetaAsset}
                  className={`platformCard ${creativeType === "IMAGE" ? "selected" : ""}`}
                  onClick={() => {
                    if (canUploadMetaAsset) setCreativeType("IMAGE");
                  }}
                >
                  <div>
                    <strong>Image</strong>
                    <span>
                      {canUploadMetaAsset
                        ? "Upload an image for this ad"
                        : "Select and connect Meta to upload an image"}
                    </span>
                  </div>
                  <div className="selectionIndicator">{creativeType === "IMAGE" ? "✓" : ""}</div>
                </button>

                <button
                  type="button"
                  disabled={!canUploadMetaAsset}
                  className={`platformCard ${creativeType === "VIDEO" ? "selected" : ""}`}
                  onClick={() => {
                    if (canUploadMetaAsset) setCreativeType("VIDEO");
                  }}
                >
                  <div>
                    <strong>Video</strong>
                    <span>
                      {canUploadMetaAsset
                        ? "Upload one video and Relay handles Meta"
                        : "Select and connect Meta to upload video"}
                    </span>
                  </div>
                  <div className="selectionIndicator">{creativeType === "VIDEO" ? "✓" : ""}</div>
                </button>
              </div>

              {creativeType === "IMAGE" && (
                <>
                  <label className="field">
                    <span>Image file</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!canUploadMetaAsset || imageUpload.status === "UPLOADING"}
                      onChange={(event) =>
                        uploadCreativeImage(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {imageUpload.status === "UPLOADING" && (
                    <p className="reviewDescription">Uploading image to Meta...</p>
                  )}
                  {imageUpload.status === "READY" && (
                    <p className="reviewDescription">
                      ✓ {imageUpload.fileName || "Image"} is ready. Relay will
                      reuse this Meta image asset when the campaign is created.
                    </p>
                  )}
                  {imageUpload.status === "ERROR" && (
                    <p className="errorText">{imageUpload.error}</p>
                  )}
                </>
              )}

              {creativeType === "VIDEO" && (
                <>
                  <label className="field">
                    <span>Video file</span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={videoUpload.status === "UPLOADING"}
                      onChange={(event) =>
                        uploadCreativeVideo(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {videoUpload.status === "UPLOADING" && (
                    <p className="reviewDescription">Uploading video to Meta...</p>
                  )}
                  {videoUpload.status === "READY" && (
                    <p className="reviewDescription">
                      ✓ {videoUpload.fileName || "Video"} is ready. Relay will
                      reuse this Meta video asset when the campaign is created.
                    </p>
                  )}
                  {videoUpload.status === "ERROR" && (
                    <p className="errorText">{videoUpload.error}</p>
                  )}
                </>
              )}
            </div>

            {selectedProduct && (
              <div className="creativePreview">
                {creativeType === "VIDEO" && videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    className="creativeImage"
                    controls
                    muted
                    playsInline
                  />
                ) : creativeType === "IMAGE" && imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt={imageUpload.fileName || "Uploaded creative"}
                    className="creativeImage"
                  />
                ) : null}
                <div className="creativePreviewContent">
                  <span className="creativeLabel">
                    {creativeType === "VIDEO" ? "VIDEO PREVIEW" : "AD PREVIEW"}
                  </span>
                  <strong>{previewCreative.headline || selectedProduct.title}</strong>
                  <p>{previewCreative.primaryText}</p>
                </div>
              </div>
            )}

            <div className="formSection">
              <ScopedCreativeFields creative={creative} scope={scope} overrides={platformOverrides[scope]?.creative ?? {}}
                setCreative={setCreative} setOverride={(key, value) => changePlatformField("creative", key, value)} />
            </div>
            {configurationError && <p role="alert" className="errorText">{configurationError}</p>}

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
                disabled={
                  !creativeIsReady || !!configurationError ||
                  imageUpload.status === "UPLOADING" ||
                  videoUpload.status === "UPLOADING"
                }
                onClick={() => setStep(5)}
              >
                {imageUpload.status === "UPLOADING" || videoUpload.status === "UPLOADING"
                  ? "Uploading..."
                  : "Continue"}
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
                <span>Creative</span>
                <strong>
                  {creativeType === "VIDEO"
                    ? `Video${videoUpload.fileName ? ` · ${videoUpload.fileName}` : ""}`
                    : `Image${imageUpload.fileName ? ` · ${imageUpload.fileName}` : ""}`}
                </strong>
              </div>
              <div className="reviewRow">
                <span>Platforms</span>
                <strong>
                  {[
                    platforms.meta ? "Meta" : null,
                    platforms.tiktok ? "TikTok" : null,
                  ].filter(Boolean).join(" + ")}
                </strong>
              </div>
              <div className="reviewRow">
                <span>Budget type</span>
                <strong>{budget.mode === "DAILY" ? "Daily" : "Total"}</strong>
              </div>
              <div className="reviewRow">
                <span>{budget.mode === "DAILY" ? "Daily budget" : "Total budget"}</span>
                <strong>
                  {currency} {budget.amount}{budget.mode === "DAILY" ? "/day" : ""}
                </strong>
              </div>
              {budget.mode === "DAILY" && (
                <div className="reviewRow">
                  <span>Estimated campaign spend</span>
                  <strong>{currency} {Number(projectedTotal).toFixed(2)}</strong>
                </div>
              )}
              <div className="reviewRow">
                <span>Duration</span>
                <strong>{budget.durationDays} days</strong>
              </div>
              <div className="reviewRow">
                <span>Budget distribution</span>
                <strong>{allocationMode === "AUTO" ? "Automatic by Relay" : "Manual"}</strong>
              </div>
            </div>

            {configurationError && <p role="alert" className="errorText">{configurationError}</p>}
            <PlatformConfigurationReview plans={resolvedPlans} currency={currency} />

            {allocationMode === "MANUAL" && hasBothPlatforms && (
              <div className="reviewSection">
                <h2>Manual allocation</h2>
                <div className="reviewRow">
                  <span>Meta</span>
                  <strong>{currency} {expectedMetaBudget}{budget.mode === "DAILY" ? "/day" : ""}</strong>
                </div>
                <div className="reviewRow">
                  <span>TikTok</span>
                  <strong>{currency} {expectedTikTokBudget}{budget.mode === "DAILY" ? "/day" : ""}</strong>
                </div>
              </div>
            )}

            {platforms.tiktok && (
              <div className="reviewSection">
                <h2>TikTok execution</h2>
                <p className="reviewDescription">
                  TikTok publishing is not available yet. You can prepare and
                  review its configuration here, but it cannot launch yet.
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
                  Relay created the Meta campaign in PAUSED mode. No ad spend is active.
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
                  disabled={
                    generatingPlan ||
                    !budgetIsCompatible ||
                    !creativeIsReady ||
                    !metaAdvancedValidation.valid || !!configurationError
                  }
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
                    !creativeIsReady ||
                    !metaAdvancedValidation.valid || !!configurationError ||
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
