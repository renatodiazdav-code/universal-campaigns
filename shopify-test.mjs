import "dotenv/config";

const shop = process.env.SHOPIFY_SHOP;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!shop || !clientId || !clientSecret) {
  throw new Error("Faltan variables en .env");
}

async function getAccessToken() {
  const response = await fetch(
    `https://${shop}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error obteniendo token: ${response.status} ${text}`);
  }

  return response.json();
}

async function getProducts(accessToken) {
  const query = `
    query GetProducts {
      products(first: 10) {
        nodes {
          id
          title
          handle
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `;

  const response = await fetch(
    `https://${shop}.myshopify.com/admin/api/2026-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  return result.data.products.nodes;
}

async function main() {
  console.log("Conectando con Shopify...");

  const tokenData = await getAccessToken();

  console.log("Shopify conectado ✓");
  console.log("Scopes:", tokenData.scope);

  const products = await getProducts(tokenData.access_token);

  console.log("\nProductos encontrados:");
  console.log(JSON.stringify(products, null, 2));
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error.message);
});