"use client";

import { useEffect, useState } from "react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetch("/api/campaigns");
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
          Campaigns created through Relay will appear here.
        </p>

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
                keep it here.
              </p>

              <a
                href="/campaign/new"
                className="continueButton"
              >
                Create campaign
              </a>
            </div>
          )}

        {campaigns.map((campaign) => (
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
              <strong>{campaign.status}</strong>
            </div>

            <div className="reviewRow">
              <span>Product</span>
              <strong>
                {campaign.input?.product?.title || "—"}
              </strong>
            </div>

            <div className="reviewRow">
              <span>Platform</span>
              <strong>
                {campaign.execution?.meta
                  ? "Meta"
                  : "—"}
              </strong>
            </div>

            <div className="reviewRow">
              <span>Budget</span>
              <strong>
                {campaign.input?.budget
                  ? `${campaign.input.budget.currency} ${campaign.input.budget.total}`
                  : "—"}
              </strong>
            </div>

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
        ))}
      </section>
    </main>
  );
}