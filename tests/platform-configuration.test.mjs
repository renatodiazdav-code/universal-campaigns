import test from "node:test";
import assert from "node:assert/strict";
import { createUniversalCampaign } from "../src/domain/universal-campaign.mjs";
import { buildPlatformPlans } from "../src/application/build-platform-plans.mjs";
import { executeMetaCampaign } from "../src/application/execute-meta-campaign.mjs";
import { resolvePlatformConfiguration } from "../src/domain/platform-configuration.mjs";
import { createMetaSettingsState, resolveMetaSettingsForm, updateMetaSettingsState, buildScopedMetaOverrides, combinePlatformOverrides } from "../src/application/platform-settings-form.mjs";

function input() {
  return {
    name: "Universal shoes", goal: "SALES",
    product: { id: "shoe", title: "Shoes", imageUrl: "https://store.test/shoes.jpg", destinationUrl: "https://store.test/products/shoes" },
    audience: { countries: ["US"], ageMin: 18, ageMax: 35, gender: "ALL" },
    budget: { mode: "TOTAL", amount: 300, currency: "USD", durationDays: 7, allocation: { meta: 160, tiktok: 140 } },
    platforms: { meta: { enabled: true, facebook: true, instagram: true }, tiktok: { enabled: true } },
    creative: { type: "IMAGE", primaryText: "Shared message", headline: "Shared headline", callToAction: "SHOP_NOW" },
  };
}

test("Universal audience and copy reach both platform plans without overrides", () => {
  const plans = buildPlatformPlans(createUniversalCampaign(input()));
  for (const plan of Object.values(plans)) {
    assert.deepEqual(plan.audience.countries, ["US"]);
    assert.equal(plan.creative.primaryText, "Shared message");
    assert.equal(plan.creative.headline, "Shared headline");
  }
});

test("native audience and creative changes stay on their own platform, including empty text", () => {
  const draft = input();
  draft.overrides = {
    meta: { audience: { countries: ["PE"], gender: "FEMALE" }, creative: { headline: "Meta headline" } },
    tiktok: { audience: { ageMax: 45 }, creative: { primaryText: "", callToAction: "LEARN_MORE" } },
  };
  const snapshot = structuredClone(draft);
  const plans = buildPlatformPlans(createUniversalCampaign(draft));
  assert.deepEqual(plans.meta.audience.countries, ["PE"]);
  assert.deepEqual(plans.tiktok.audience.countries, ["US"]);
  assert.equal(plans.meta.audience.gender, "FEMALE");
  assert.equal(plans.tiktok.audience.gender, "ALL");
  assert.equal(plans.meta.audience.ageMax, 35);
  assert.equal(plans.tiktok.audience.ageMax, 45);
  assert.equal(plans.meta.creative.primaryText, "Shared message");
  assert.equal(plans.tiktok.creative.primaryText, "");
  assert.equal(plans.meta.creative.headline, "Meta headline");
  assert.equal(plans.tiktok.creative.headline, "Shared headline");
  assert.equal(plans.tiktok.creative.callToAction, "LEARN_MORE");
  assert.deepEqual(draft, snapshot);
});

test("removing an override restores live inheritance from Universal", () => {
  const draft = input();
  draft.overrides = { tiktok: { creative: { primaryText: "Custom" } } };
  draft.creative.primaryText = "New shared message";
  assert.equal(buildPlatformPlans(createUniversalCampaign(draft)).tiktok.creative.primaryText, "Custom");
  delete draft.overrides.tiktok.creative.primaryText;
  assert.equal(buildPlatformPlans(createUniversalCampaign(draft)).tiktok.creative.primaryText, "New shared message");
});

test("Universal advanced delivery and bidding translate to both plans; native bidding replaces the shared group", () => {
  const draft = input();
  draft.settings = { audience: { mode: "SPECIFIC" }, bidding: { strategy: "COST_CAP", costCap: 12 } };
  draft.overrides = { tiktok: { bidding: { strategy: "LOWEST_COST" } } };
  const plans = buildPlatformPlans(createUniversalCampaign(draft));
  assert.equal(plans.meta.audience.mode, "SPECIFIC");
  assert.equal(plans.tiktok.audience.mode, "SPECIFIC");
  assert.equal(plans.meta.bidding.costCap, 12);
  assert.equal(plans.tiktok.bidding.strategy, "LOWEST_COST");
  assert.equal(plans.tiktok.bidding.costCap, null);
  assert.equal(plans.meta.budget.allocated + plans.tiktok.budget.allocated, 300);
});

test("overrides cannot change authorized platform budgets", () => {
  const draft = input();
  draft.overrides = { meta: { budget: { allocated: 900 } } };
  assert.throws(() => createUniversalCampaign(draft), /budget distribution/);
});

test("invalid ages, malformed scoped objects and unsafe override destinations are rejected before execution", () => {
  for (const override of [
    { audience: { ageMin: 50 } },
    { audience: { ageMin: "" } },
    { audience: { countries: [] } },
    { audience: [] },
    { creative: { destinationUrl: "javascript:alert(1)" } },
    { creative: { primaryText: 12 } },
    { creative: { type: "VIDEO" } },
  ]) {
    const draft = input(); draft.overrides = { tiktok: override };
    assert.throws(() => createUniversalCampaign(draft));
  }
});

test("direct adapter calls also validate scoped inputs", () => {
  const draft = input(); draft.overrides = { meta: { audience: { gender: "INVALID" } } };
  assert.throws(() => buildPlatformPlans(draft), /valid gender/);
});

test("Meta execution sends the final platform copy and audience, not the shared originals", async () => {
  const draft = input();
  draft.overrides = { meta: { audience: { countries: ["PE"] }, creative: { primaryText: "Meta copy", destinationUrl: "https://store.test/meta" } } };
  const calls = {};
  const result = await executeMetaCampaign({
    campaign: createUniversalCampaign(draft),
    connection: { accessToken: "test-only", setup: { adAccount: { id: "act_test" }, page: { id: "page" } }, salesSetup: { pixel: { id: "pixel" } } },
    metaClient: {
      createCampaign: async () => ({ id: "campaign" }),
      createAdSet: async (value) => { calls.audience = value; return { id: "set" }; },
      createAdCreative: async (value) => { calls.creative = value; return { id: "creative" }; },
      createAd: async () => ({ id: "ad" }),
    },
  });
  assert.equal(result.status, "CREATED");
  assert.deepEqual(calls.audience.countries, ["PE"]);
  assert.equal(calls.creative.message, "Meta copy");
  assert.equal(calls.creative.destinationUrl, "https://store.test/meta");
});

test("changing native attribution does not freeze inherited Universal bidding or audience", () => {
  const shared = { audienceMode: "AUTO", biddingStrategy: "LOWEST_COST", costCap: "" };
  let state = createMetaSettingsState();
  state = updateMetaSettingsState(state, (current) => ({ ...current, attributionMode: "STANDARD" }), shared);
  const changedShared = { audienceMode: "SPECIFIC", biddingStrategy: "COST_CAP", costCap: "9" };
  const resolved = resolveMetaSettingsForm(state, changedShared);
  assert.equal(resolved.audienceStrategy, "MANUAL");
  assert.equal(resolved.biddingStrategy, "COST_CAP");
  assert.equal(resolved.costCap, "9");
  const overrides = buildScopedMetaOverrides(state, changedShared);
  assert.equal(overrides.attribution.mode, "STANDARD");
  assert.equal(overrides.bidding, undefined);
  assert.equal(overrides.audienceStrategy, undefined);
});

test("customized native bidding remains independent and reset restores Universal", () => {
  const shared = { audienceMode: "AUTO", biddingStrategy: "COST_CAP", costCap: "10" };
  let state = updateMetaSettingsState(createMetaSettingsState(), (current) => ({ ...current, biddingStrategy: "LOWEST_COST" }), shared);
  assert.equal(buildScopedMetaOverrides(state, shared).bidding.strategy, "LOWEST_COST");
  assert.equal(resolveMetaSettingsForm(state, { ...shared, costCap: "20" }).biddingStrategy, "LOWEST_COST");
  state = createMetaSettingsState();
  assert.deepEqual(buildScopedMetaOverrides(state, shared), {});
  assert.equal(resolveMetaSettingsForm(state, shared).costCap, "10");
});

test("basic audience overrides preserve native Custom Audiences when combined", () => {
  const combined = combinePlatformOverrides({ audience: { countries: ["PE"] } }, { audience: { includedAudiences: [{ id: "a", name: "Buyers" }] } });
  assert.deepEqual(combined.audience.countries, ["PE"]);
  assert.equal(combined.audience.includedAudiences[0].id, "a");
});

test("resolved configuration does not mutate universal settings or overrides", () => {
  const campaign = createUniversalCampaign(input());
  const snapshot = structuredClone(campaign);
  resolvePlatformConfiguration(campaign, "meta");
  resolvePlatformConfiguration(campaign, "tiktok");
  assert.deepEqual(campaign, snapshot);
});
