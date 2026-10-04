export async function getDevShopifyAccessToken({
  shop,
  clientId,
  clientSecret,
}) {
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
    throw new Error(
      `Could not authenticate with Shopify: ${response.status} ${text}`
    );
  }

  return response.json();
}