"use client";

import { useEffect, useState } from "react";

export default function NewCampaignPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main className="campaignPage">
      <header className="campaignHeader">
        <a href="/" className="logo">
          Relay
        </a>

        <span className="stepLabel">Step 1 of 5</span>
      </header>

      <section className="campaignContent">
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

        {error && (
          <p className="errorText">{error}</p>
        )}

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
          >
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}