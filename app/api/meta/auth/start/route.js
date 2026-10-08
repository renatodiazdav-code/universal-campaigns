export async function GET() {
  const appId = process.env.META_APP_ID;

  if (!appId) {
    return Response.json(
      {
        error: "META_APP_ID is missing",
      },
      {
        status: 500,
      }
    );
  }

  const redirectUri =
    "http://localhost:3000/api/meta/auth/callback";

  const scopes = [
    "ads_management",
    "ads_read",
    "pages_show_list",
    "business_management",
  ];

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
  });

  const authorizationUrl =
    `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

  return Response.redirect(authorizationUrl);
}