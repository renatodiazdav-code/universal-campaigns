import { shopifyGraphql, normalizeShopDomain, ShopifyError } from "./client.mjs";

export async function listShopifyProducts({ shop, accessToken, first = 50, after = null, search = null, fetchImpl = fetch }) {
  if (!Number.isInteger(first) || first < 1 || first > 100 || (after !== null && (typeof after !== "string" || after.length > 1024)) ||
      (search !== null && (typeof search !== "string" || search.length > 200))) {
    throw new ShopifyError("Choose valid product pagination and search values.", 400, "INVALID_PRODUCT_QUERY");
  }
  const query = `
    query RelayProducts($first: Int!, $after: String, $search: String) {
      products(first: $first, after: $after, query: $search) {
        nodes {
          id title handle status onlineStoreUrl
          featuredMedia { preview { image { url } } }
          images(first: 8) { nodes { url altText } }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const data = await shopifyGraphql({ shop, accessToken, query, variables: { first, after, search }, fetchImpl });
  if (!Array.isArray(data.products?.nodes)) throw new ShopifyError("Shopify returned no product list.", 502, "INVALID_RESPONSE");
  return { products: data.products.nodes, pageInfo: data.products.pageInfo ?? { hasNextPage: false, endCursor: null } };
}

export async function getShopifyProducts(options) {
  return (await listShopifyProducts({ ...options, first: options.first ?? 10 })).products;
}

export function shopifyProductToUniversalProduct(product, shop) {
  const price = product.priceRangeV2.minVariantPrice;
  const hasPublicationInfo = Object.hasOwn(product, "onlineStoreUrl");
  return {
    source: "SHOPIFY", id: product.id, title: product.title,
    price: Number(price.amount), currency: price.currencyCode,
    priceRange: { min: Number(price.amount), max: Number(product.priceRangeV2.maxVariantPrice?.amount ?? price.amount) },
    imageUrl: product.featuredMedia?.preview?.image?.url ?? product.images?.nodes?.[0]?.url ?? null,
    images: product.images?.nodes ?? [],
    destinationUrl: hasPublicationInfo ? product.onlineStoreUrl : `https://${normalizeShopDomain(shop)}/products/${encodeURIComponent(product.handle)}`,
    published: hasPublicationInfo ? Boolean(product.onlineStoreUrl) && product.status !== "DRAFT" && product.status !== "ARCHIVED" : undefined,
  };
}
