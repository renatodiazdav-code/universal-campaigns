"use client";

const POSITIONS = [
  ["FEED", "Feed"],
  ["STORIES", "Stories"],
  ["REELS", "Reels"],
];

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

export default function MetaAdvancedSettings({
  hasBothPlatforms,
  allocationMode,
  changeAllocationMode,
  budget,
  currency,
  setBudget,
  autoAllocation,
  metaEnabled,
  facebookEnabled,
  instagramEnabled,
  metaAdvanced,
  setMetaAdvanced,
  validation,
}) {
  return (
    <div className="advancedPanel">
      <div className="advancedPanelHeader">
        <div>
          <span className="creativeLabel">ADVANCED SETTINGS</span>
          <h2>Campaign controls</h2>
        </div>
      </div>

      <div className="reviewSection">
        <h2>Budget distribution</h2>

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
      </div>

      {metaEnabled && (
        <>
          <div className="reviewSection">
            <h2>Meta audience</h2>

            <label className="field">
              <span>Audience strategy</span>
              <select
                value={metaAdvanced.audienceStrategy}
                onChange={(event) =>
                  setMetaAdvanced((current) => ({
                    ...current,
                    audienceStrategy: event.target.value,
                  }))
                }
              >
                <option value="ADVANTAGE_PLUS">Advantage+ (Recommended)</option>
                <option value="MANUAL">Manual targeting</option>
              </select>
            </label>

            <p className="reviewDescription">
              {metaAdvanced.audienceStrategy === "ADVANTAGE_PLUS"
                ? "Meta can use Advantage+ audience while Relay keeps your country, age and gender limits."
                : "Advantage+ audience is disabled. Meta uses the country, age and gender you set above without audience expansion."}
            </p>
          </div>

          <div className="reviewSection">
            <h2>Meta bidding</h2>

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
                <option value="LOWEST_COST">Lowest cost (Recommended)</option>
                <option value="COST_CAP">Cost cap</option>
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
          </div>

          <div className="reviewSection">
            <h2>Meta placements</h2>

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
          </div>

          {!validation.valid && (
            <p className="errorText">{validation.error}</p>
          )}
        </>
      )}
    </div>
  );
}
