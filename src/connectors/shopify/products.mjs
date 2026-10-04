export async function getShopifyProducts({
  shop,
  accessToken,
  first = 10,
}) {
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
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
      body: JSON.stringify({
        query,
        variables: { first },
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  return result.data.products.nodes;
}

export function shopifyProductToUniversalProduct(product, shop) {
  const price = product.priceRangeV2.minVariantPrice;

  return {
    source: "SHOPIFY",
    id: product.id,
    title: product.title,
    price: Number(price.amount),
    currency: price.currencyCode,

    imageUrl:
      product.featuredMedia?.preview?.image?.url ?? null,

    destinationUrl:
      `https://${shop}.myshopify.com/products/${product.handle}`,
  };
}