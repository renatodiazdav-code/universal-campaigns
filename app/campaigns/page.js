"use client";

import { useEffect, useState } from "react";
import ConnectedAccounts from "./ConnectedAccounts";

function formatMoney(value, currency) {
    if (value == null) {
        return "—";
    }

    const safeCurrency = currency || "PEN";

    return `${safeCurrency} ${Number(value).toFixed(2)}`;
}

function formatRoas(value) {
    if (value == null) {
        return "—";
    }

    return `${Number(value).toFixed(2)}x`;
}

function formatPlatformResult(metrics, currency) {
    const sales = metrics?.sales ?? 0;
    const salesLabel = sales === 1 ? "sale" : "sales";

    return `${formatMoney(
        metrics?.spend ?? 0,
        currency
    )} · ${sales} ${salesLabel} · ${formatRoas(
        metrics?.roas
    )} ROAS`;
}

function getPlatformLabel(campaign) {
    const platforms = Object.values(
        campaign.performance?.platforms || {}
    )
        .map((platform) => platform?.platform)
        .filter(Boolean);

    if (platforms.length > 0) {
        return platforms
            .map((platform) =>
                platform.charAt(0) +
                platform.slice(1).toLowerCase()
            )
            .join(" + ");
    }

    if (campaign.execution?.meta) {
        return "Meta";
    }

    return "—";
}

function formatCampaignBudget(budget) {
    if (!budget) {
        return "—";
    }

    const currency = budget.currency || "PEN";
    const mode = budget.mode || "TOTAL";

    if (mode === "DAILY") {
        const dailyAmount = budget.amount ?? 0;
        const projectedTotal =
            budget.projectedTotal ?? budget.total ?? 0;

        return `${currency} ${Number(dailyAmount).toFixed(2)}/day · ${budget.durationDays} days · est. ${currency} ${Number(projectedTotal).toFixed(2)}`;
    }

    const totalAmount = budget.amount ?? budget.total;

    return `${currency} ${Number(totalAmount).toFixed(2)} total`;
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCampaigns() {
            try {
                const response = await fetch("/api/campaigns");
                if (response.status === 401) { window.location.assign("/login"); return; }
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Could not load campaigns"
                    );
                }

                setCampaigns(data.campaigns || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadCampaigns();
    }, []);

    return (
        <main className="campaignPage">
            <header className="campaignHeader">
                <a href="/" className="logo">
                    Relay
                </a>

                <a
                    href="/campaign/new"
                    className="continueButton"
                >
                    + Create campaign
                </a>
            </header>

            <section className="campaignContent">
                <p className="eyebrow">
                    CAMPAIGNS
                </p>

                <h1 className="campaignTitle">
                    Your campaigns
                </h1>

                <p className="campaignSubtitle">
                    See how your ads are performing without opening Ads Manager.
                </p>

                <ConnectedAccounts />

                {loading && (
                    <p className="loadingText">
                        Loading campaigns...
                    </p>
                )}

                {error && (
                    <p className="errorText">
                        {error}
                    </p>
                )}

                {!loading &&
                    !error &&
                    campaigns.length === 0 && (
                        <div className="reviewSection">
                            <h2>No campaigns yet</h2>

                            <p className="reviewDescription">
                                Create your first campaign and Relay will
                                keep its status and performance here.
                            </p>

                            <a
                                href="/campaign/new"
                                className="continueButton"
                            >
                                Create campaign
                            </a>
                        </div>
                    )}

                {campaigns.map((campaign) => {
                    const metrics =
                        campaign.performance?.metrics;

                    const metaPerformance =
                        campaign.performance?.platforms?.meta;

                    const publisherBreakdown =
                        metaPerformance?.breakdowns
                            ?.publisherPlatform || [];

                    const currency =
                        metrics?.currency ||
                        campaign.input?.budget?.currency ||
                        "PEN";

                    return (
                        <div
                            key={campaign.id}
                            className="reviewSection"
                        >
                            <div className="reviewRow">
                                <span>Campaign</span>
                                <strong>{campaign.name}</strong>
                            </div>

                            <div className="reviewRow">
                                <span>Status</span>
                                <strong>
                                    {campaign.liveStatus?.ad?.effectiveStatus ||
                                        campaign.liveStatus?.campaign?.effectiveStatus ||
                                        campaign.status}
                                </strong>
                            </div>

                            {metrics ? (
                                <>
                                    <div className="reviewRow">
                                        <span>Spend</span>
                                        <strong>
                                            {formatMoney(
                                                metrics.spend,
                                                currency
                                            )}
                                        </strong>
                                    </div>

                                    <div className="reviewRow">
                                        <span>Sales</span>
                                        <strong>
                                            {metrics.sales ?? 0}
                                        </strong>
                                    </div>

                                    <div className="reviewRow">
                                        <span>Revenue</span>
                                        <strong>
                                            {formatMoney(
                                                metrics.revenue,
                                                currency
                                            )}
                                        </strong>
                                    </div>

                                    <div className="reviewRow">
                                        <span>Cost / sale</span>
                                        <strong>
                                            {formatMoney(
                                                metrics.costPerSale,
                                                currency
                                            )}
                                        </strong>
                                    </div>

                                    <div className="reviewRow">
                                        <span>ROAS</span>
                                        <strong>
                                            {formatRoas(metrics.roas)}
                                        </strong>
                                    </div>

                                    {publisherBreakdown.map(
                                        (publisher) => (
                                            <div
                                                key={publisher.id}
                                                className="reviewRow"
                                            >
                                                <span>
                                                    {publisher.name}
                                                </span>
                                                <strong>
                                                    {formatPlatformResult(
                                                        publisher.metrics,
                                                        publisher.metrics?.currency || currency
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </>
                            ) : campaign.performance?.error ? (
                                <p className="errorText">
                                    Performance is temporarily unavailable.
                                </p>
                            ) : (
                                <p className="reviewDescription">
                                    No performance data yet.
                                </p>
                            )}

                            <div className="reviewRow">
                                <span>Product</span>
                                <strong>
                                    {campaign.input?.product?.title || "—"}
                                </strong>
                            </div>

                            <div className="reviewRow">
                                <span>Platform</span>
                                <strong>
                                    {getPlatformLabel(campaign)}
                                </strong>
                            </div>

                            <div className="reviewRow">
                                <span>Budget</span>
                                <strong>
                                    {formatCampaignBudget(
                                        campaign.input?.budget
                                    )}
                                </strong>
                            </div>

                            {campaign.liveStatus?.checkedAt && (
                                <div className="reviewRow">
                                    <span>Last checked</span>
                                    <strong>
                                        {new Date(
                                            campaign.liveStatus.checkedAt
                                        ).toLocaleTimeString()}
                                    </strong>
                                </div>
                            )}

                            <div className="reviewRow">
                                <span>Created</span>
                                <strong>
                                    {campaign.createdAt
                                        ? new Date(
                                            campaign.createdAt
                                        ).toLocaleString()
                                        : "—"}
                                </strong>
                            </div>
                        </div>
                    );
                })}
            </section>
        </main>
    );
}
