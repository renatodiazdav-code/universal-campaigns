"use client";

import { useEffect, useMemo, useState } from "react";

const POSITIONS = [
  ["FEED", "Feed"],
  ["STORIES", "Stories"],
  ["REELS", "Reels"],
];

const BROWSE_GROUPS = [
  ["DEMOGRAPHICS", "Demographics"],
  ["INTERESTS", "Interests"],
  ["BEHAVIORS", "Behaviors"],
];

function humanizeType(type) {
  return String(type ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AdvancedSection({ title, summary, children }) {
  return (
    <details className="reviewSection">
      <summary
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <strong style={{ fontSize: 18 }}>{title}</strong>
        <span className="reviewDescription" style={{ margin: 0 }}>
          {summary}
        </span>
      </summary>
      <div style={{ marginTop: 18 }}>{children}</div>
    </details>
  );
}

function PlacementCheckboxes({
  label,
  field,
  positions,
  setMetaAdvanced,
}) {
  function toggle(position) {
    setMetaAdvanced((current) => {
      const selected = current[field] ?? [];
      const next = selected.includes(position)
        ? selected.filter((item) => item !== position)
        : [...selected, position];

      return {
        ...current,
        [field]: next,
      };
    });
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {POSITIONS.map(([value, text]) => (
          <label
            key={value}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <input
              type="checkbox"
              checked={positions.includes(value)}
              onChange={() => toggle(value)}
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SelectedItems({ items, emptyText, onRemove, describe }) {
  if (!items?.length) {
    return <p className="reviewDescription">{emptyText}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {items.map((item) => (
        <div
          key={`${item.type || item.kind || "audience"}-${item.id}`}
          className="reviewRow"
        >
          <span>
            <strong>{item.name}</strong>
            <br />
            <small>{describe(item)}</small>
          </span>
          <button
            type="button"
            className="stepBackButton"
            onClick={() => onRemove(item)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function attributionSummary(metaAdvanced) {
  if (metaAdvanced.attributionMode !== "STANDARD") {
    return "Automatic by Relay";
  }

  const parts = [
    `${metaAdvanced.clickAttributionDays || "7"}d click`,
    metaAdvanced.viewAttributionDays === "0"
      ? "view off"
      : "1d view",
    metaAdvanced.engagedViewAttributionDays === "0"
      ? "engaged-view off"
      : "1d engaged-view",
  ];

  return `Standard · ${parts.join(" · ")}`;
}

export default function MetaAdvancedSettings({
  hasBothPlatforms,
  allocationMode,
  changeAllocationMode,
  budget,
  currency,
  setBudget,
  metaEnabled,
  facebookEnabled,
  instagramEnabled,
  metaAdvanced,
  setMetaAdvanced,
  validation,
  showBudgetDistribution = true,
}) {
  const [existingAudiences, setExistingAudiences] = useState([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [audiencesError, setAudiencesError] = useState("");
  const [includedSearch, setIncludedSearch] = useState("");
  const [excludedSearch, setExcludedSearch] = useState("");

  const [targetingQuery, setTargetingQuery] = useState("");
  const [targetingResults, setTargetingResults] = useState([]);
  const [targetingLoading, setTargetingLoading] = useState(false);
  const [targetingError, setTargetingError] = useState("");

  useEffect(() => {
    if (!metaEnabled) {
      return;
    }

    const controller = new AbortController();

    async function loadExistingAudiences() {
      setAudiencesLoading(true);
      setAudiencesError("");

      try {
        const response = await fetch("/api/meta/audiences", {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load Meta audiences");
        }

        setExistingAudiences(data.audiences ?? []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setAudiencesError(error.message);
          setExistingAudiences([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAudiencesLoading(false);
        }
      }
    }

    loadExistingAudiences();

    return () => controller.abort();
  }, [metaEnabled]);

  useEffect(() => {
    const query = targetingQuery.trim();

    if (!metaEnabled || query.length < 2) {
      setTargetingResults([]);
      setTargetingError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setTargetingLoading(true);
      setTargetingError("");

      try {
        const response = await fetch(
          `/api/meta/targeting-options?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not search Meta targeting options"
          );
        }

        setTargetingResults(data.options ?? []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setTargetingError(error.message);
          setTargetingResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setTargetingLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [metaEnabled, targetingQuery]);

  const includedResults = useMemo(() => {
    const query = includedSearch.trim().toLowerCase();
    if (!query) return [];

    return existingAudiences
      .filter((audience) =>
        audience.name.toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [existingAudiences, includedSearch]);

  const excludedResults = useMemo(() => {
    const query = excludedSearch.trim().toLowerCase();
    if (!query) return [];

    return existingAudiences
      .filter((audience) =>
        audience.name.toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [existingAudiences, excludedSearch]);

  function selectExistingAudience(field, audience) {
    const otherField =
      field === "includedAudiences"
        ? "excludedAudiences"
        : "includedAudiences";

    setMetaAdvanced((current) => {
      const selected = current[field] ?? [];
      const alreadySelected = selected.some(
        (item) => item.id === audience.id
      );

      return {
        ...current,
        [field]: alreadySelected
          ? selected
          : [...selected, audience],
        [otherField]: (current[otherField] ?? []).filter(
          (item) => item.id !== audience.id
        ),
      };
    });
  }

  function removeExistingAudience(field, audience) {
    setMetaAdvanced((current) => ({
      ...current,
      [field]: (current[field] ?? []).filter(
        (item) => item.id !== audience.id
      ),
    }));
  }

  function selectDetailedTargeting(option) {
    setMetaAdvanced((current) => {
      const selected = current.detailedTargeting ?? [];
      const exists = selected.some(
        (item) =>
          item.id === option.id && item.type === option.type
      );

      return {
        ...current,
        detailedTargeting: exists
          ? selected
          : [...selected, option],
      };
    });
  }

  function removeDetailedTargeting(option) {
    setMetaAdvanced((current) => ({
      ...current,
      detailedTargeting: (current.detailedTargeting ?? []).filter(
        (item) =>
          !(item.id === option.id && item.type === option.type)
      ),
    }));
  }

  async function browseTargeting(group) {
    setTargetingQuery("");
    setTargetingLoading(true);
    setTargetingError("");

    try {
      const response = await fetch(
        `/api/meta/targeting-options?browse=${encodeURIComponent(group)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not browse Meta targeting options"
        );
      }

      setTargetingResults(data.options ?? []);
    } catch (error) {
      setTargetingError(error.message);
      setTargetingResults([]);
    } finally {
      setTargetingLoading(false);
    }
  }

  const budgetSummary = !hasBothPlatforms
    ? "Full budget to the selected platform"
    : allocationMode === "AUTO"
      ? "Automatic by Relay"
      : "Manual distribution";

  const audienceSummary =
    metaAdvanced.audienceStrategy === "ADVANTAGE_PLUS"
      ? "Advantage+ audience"
      : "Specific audience";

  const biddingSummary =
    metaAdvanced.biddingStrategy === "COST_CAP"
      ? `Cost per result goal · ${currency} ${Number(metaAdvanced.costCap || 0).toFixed(2)}`
      : "Highest volume";

  const placementsSummary =
    metaAdvanced.placementsMode === "RECOMMENDED"
      ? "Relay recommended"
      : "Manual placements";

  return (
    <div className="advancedPanel">
      <div className="advancedPanelHeader">
        <div>
          <span className="creativeLabel">ADVANCED SETTINGS</span>
          <h2>Campaign controls</h2>
          <p className="reviewDescription">
            Relay keeps recommended defaults until you open a section and change
            something. Professional controls stay available without cluttering
            the basic campaign flow.
          </p>
        </div>
      </div>

      {showBudgetDistribution && <AdvancedSection title="Budget distribution" summary={budgetSummary}>
        {hasBothPlatforms ? (
          <>
            <label className="field">
              <span>Distribution</span>
              <select
                value={allocationMode}
                onChange={(event) => changeAllocationMode(event.target.value)}
              >
                <option value="AUTO">Automatic by Relay</option>
                <option value="MANUAL">Set manually</option>
              </select>
            </label>

            {allocationMode === "AUTO" ? (
              <p className="reviewDescription">
                Relay chooses a technically valid distribution across Meta and
                TikTok. This v0.1 rule starts from an even split and adjusts only
                when a platform minimum requires it.
              </p>
            ) : (
              <div className="fieldRow advancedBudgetFields">
                <label className="field">
                  <span>
                    Meta {budget.mode === "DAILY" ? "daily" : "total"} budget ({currency})
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
                    TikTok {budget.mode === "DAILY" ? "daily" : "total"} budget ({currency})
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
          </>
        ) : (
          <p className="reviewDescription">
            Only one platform is selected, so it receives the full campaign
            budget automatically.
          </p>
        )}
      </AdvancedSection>}

      {metaEnabled && (
        <>
          <AdvancedSection title="Audience" summary={audienceSummary}>
            <label className="field">
              <span>Audience delivery</span>
              <select
                value={metaAdvanced.audienceStrategy}
                onChange={(event) =>
                  setMetaAdvanced((current) => ({
                    ...current,
                    audienceStrategy: event.target.value,
                  }))
                }
              >
                <option value="ADVANTAGE_PLUS">
                  Advantage+ audience (Recommended)
                </option>
                <option value="MANUAL">
                  I need a specific audience
                </option>
              </select>
            </label>

            {metaAdvanced.audienceStrategy === "ADVANTAGE_PLUS" ? (
              <p className="reviewDescription">
                Meta can go beyond audience suggestions to find more purchasers.
                Location, minimum age and excluded audiences remain controls.
                Maximum age, gender, included audiences, lookalikes and detailed
                targeting can act as suggestions for this Sales/Purchase campaign.
              </p>
            ) : (
              <p className="reviewDescription">
                Relay switches off Advantage+ audience delivery. Your age range,
                gender and included Custom Audiences can be used as restrictions.
                For Sales/Purchase, Lookalikes and detailed targeting may still be
                expanded by Meta rather than acting as absolute limits.
              </p>
            )}

            {audiencesLoading && (
              <p className="reviewDescription">Checking existing Meta audiences...</p>
            )}
            {audiencesError && (
              <p className="errorText">{audiencesError}</p>
            )}

            {!audiencesLoading &&
              !audiencesError &&
              existingAudiences.length > 0 && (
                <>
                  <div className="field" style={{ marginTop: 18 }}>
                    <span>Existing audiences to include (optional)</span>
                    <input
                      type="search"
                      value={includedSearch}
                      onChange={(event) => setIncludedSearch(event.target.value)}
                      placeholder="Search existing Custom or Lookalike Audiences..."
                    />

                    {includedSearch.trim() && (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {includedResults.length === 0 ? (
                          <p className="reviewDescription">
                            No existing Meta audience matches that search.
                          </p>
                        ) : (
                          includedResults.map((audience) => (
                            <button
                              key={`include-${audience.id}`}
                              type="button"
                              className="stepBackButton"
                              onClick={() => {
                                selectExistingAudience("includedAudiences", audience);
                                setIncludedSearch("");
                              }}
                              style={{ textAlign: "left" }}
                            >
                              {audience.name} · {audience.kind === "LOOKALIKE" ? "Lookalike" : "Custom Audience"}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <SelectedItems
                      items={metaAdvanced.includedAudiences ?? []}
                      emptyText="No existing audiences selected."
                      onRemove={(audience) =>
                        removeExistingAudience("includedAudiences", audience)
                      }
                      describe={(audience) =>
                        audience.kind === "LOOKALIKE"
                          ? "Lookalike Audience"
                          : "Custom Audience"
                      }
                    />
                  </div>

                  <div className="field" style={{ marginTop: 18 }}>
                    <span>Excluded audiences (optional)</span>
                    <input
                      type="search"
                      value={excludedSearch}
                      onChange={(event) => setExcludedSearch(event.target.value)}
                      placeholder="Search existing audiences to exclude..."
                    />

                    {excludedSearch.trim() && (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {excludedResults.length === 0 ? (
                          <p className="reviewDescription">
                            No existing Meta audience matches that search.
                          </p>
                        ) : (
                          excludedResults.map((audience) => (
                            <button
                              key={`exclude-${audience.id}`}
                              type="button"
                              className="stepBackButton"
                              onClick={() => {
                                selectExistingAudience("excludedAudiences", audience);
                                setExcludedSearch("");
                              }}
                              style={{ textAlign: "left" }}
                            >
                              {audience.name} · {audience.kind === "LOOKALIKE" ? "Lookalike" : "Custom Audience"}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <SelectedItems
                      items={metaAdvanced.excludedAudiences ?? []}
                      emptyText="No audiences excluded."
                      onRemove={(audience) =>
                        removeExistingAudience("excludedAudiences", audience)
                      }
                      describe={() => "Audience control"}
                    />
                  </div>
                </>
              )}

            <div className="field" style={{ marginTop: 18 }}>
              <span>Detailed targeting (optional)</span>
              <input
                type="search"
                value={targetingQuery}
                onChange={(event) => setTargetingQuery(event.target.value)}
                placeholder="Search demographics, interests or behaviors..."
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <span className="reviewDescription" style={{ margin: 0 }}>
                  Browse:
                </span>
                {BROWSE_GROUPS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="stepBackButton"
                    onClick={() => browseTargeting(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {targetingLoading && (
                <p className="reviewDescription">
                  Searching Meta targeting options...
                </p>
              )}
              {targetingError && (
                <p className="errorText">{targetingError}</p>
              )}

              {!targetingLoading && targetingResults.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {targetingResults.slice(0, 20).map((option) => (
                    <button
                      key={`${option.type}-${option.id}`}
                      type="button"
                      className="stepBackButton"
                      onClick={() => selectDetailedTargeting(option)}
                      style={{ textAlign: "left" }}
                    >
                      {option.name} · {humanizeType(option.type)}
                    </button>
                  ))}
                </div>
              )}

              <SelectedItems
                items={metaAdvanced.detailedTargeting ?? []}
                emptyText="No detailed targeting selected."
                onRemove={removeDetailedTargeting}
                describe={(option) =>
                  `${humanizeType(option.type)} · audience signal for Sales/Purchase`
                }
              />
            </div>
          </AdvancedSection>

          <AdvancedSection title="Bidding & value" summary={biddingSummary}>
            <label className="field">
              <span>Bidding strategy</span>
              <select
                value={metaAdvanced.biddingStrategy}
                onChange={(event) =>
                  setMetaAdvanced((current) => ({
                    ...current,
                    biddingStrategy: event.target.value,
                  }))
                }
              >
                <option value="LOWEST_COST">Highest volume (Recommended)</option>
                <option value="COST_CAP">Cost per result goal</option>
              </select>
            </label>

            {metaAdvanced.biddingStrategy === "COST_CAP" && (
              <label className="field">
                <span>Target cost per purchase ({currency})</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={metaAdvanced.costCap}
                  onChange={(event) =>
                    setMetaAdvanced((current) => ({
                      ...current,
                      costCap: event.target.value,
                    }))
                  }
                  placeholder="e.g. 20.00"
                />
              </label>
            )}
          </AdvancedSection>

          <AdvancedSection
            title="Attribution"
            summary={attributionSummary(metaAdvanced)}
          >
            <label className="field">
              <span>Attribution settings</span>
              <select
                value={metaAdvanced.attributionMode ?? "AUTO"}
                onChange={(event) =>
                  setMetaAdvanced((current) => ({
                    ...current,
                    attributionMode: event.target.value,
                  }))
                }
              >
                <option value="AUTO">Automatic by Relay (Recommended)</option>
                <option value="STANDARD">Customize Standard attribution</option>
              </select>
            </label>

            {metaAdvanced.attributionMode !== "STANDARD" ? (
              <p className="reviewDescription">
                Relay leaves the Standard attribution windows on Meta's compatible
                default for this Sales/Website/Purchase campaign.
              </p>
            ) : (
              <>
                <div className="reviewRow">
                  <span>Model</span>
                  <strong>Standard</strong>
                </div>

                <label className="field">
                  <span>Click-through</span>
                  <select
                    value={metaAdvanced.clickAttributionDays ?? "7"}
                    onChange={(event) =>
                      setMetaAdvanced((current) => ({
                        ...current,
                        clickAttributionDays: event.target.value,
                      }))
                    }
                  >
                    <option value="7">7 days</option>
                    <option value="1">1 day</option>
                  </select>
                </label>

                <label className="field">
                  <span>Engaged-view</span>
                  <select
                    value={metaAdvanced.engagedViewAttributionDays ?? "1"}
                    onChange={(event) =>
                      setMetaAdvanced((current) => ({
                        ...current,
                        engagedViewAttributionDays: event.target.value,
                      }))
                    }
                  >
                    <option value="1">1 day</option>
                    <option value="0">Off</option>
                  </select>
                </label>
                <p className="reviewDescription">
                  Engaged-view is only sent when the ad creative is a video.
                </p>

                <label className="field">
                  <span>View-through</span>
                  <select
                    value={metaAdvanced.viewAttributionDays ?? "1"}
                    onChange={(event) =>
                      setMetaAdvanced((current) => ({
                        ...current,
                        viewAttributionDays: event.target.value,
                      }))
                    }
                  >
                    <option value="1">1 day</option>
                    <option value="0">Off</option>
                  </select>
                </label>
              </>
            )}
          </AdvancedSection>

          <AdvancedSection title="Placements" summary={placementsSummary}>
            <label className="field">
              <span>Placements</span>
              <select
                value={metaAdvanced.placementsMode}
                onChange={(event) =>
                  setMetaAdvanced((current) => ({
                    ...current,
                    placementsMode: event.target.value,
                  }))
                }
              >
                <option value="RECOMMENDED">Relay recommended</option>
                <option value="MANUAL">Set manually</option>
              </select>
            </label>

            {metaAdvanced.placementsMode === "RECOMMENDED" ? (
              <p className="reviewDescription">
                Relay uses Facebook Feed, Stories and Reels plus Instagram Feed,
                Stories and Reels. Messenger and Audience Network stay excluded.
              </p>
            ) : (
              <>
                {facebookEnabled && (
                  <PlacementCheckboxes
                    label="Facebook"
                    field="facebookPositions"
                    positions={metaAdvanced.facebookPositions}
                    setMetaAdvanced={setMetaAdvanced}
                  />
                )}

                {instagramEnabled && (
                  <PlacementCheckboxes
                    label="Instagram"
                    field="instagramPositions"
                    positions={metaAdvanced.instagramPositions}
                    setMetaAdvanced={setMetaAdvanced}
                  />
                )}
              </>
            )}
          </AdvancedSection>

          {!validation.valid && (
            <p className="errorText">{validation.error}</p>
          )}
        </>
      )}
    </div>
  );
}
