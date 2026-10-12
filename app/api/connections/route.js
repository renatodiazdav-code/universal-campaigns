import { withUser } from "../../../src/application/auth-http.mjs";
import { createConnectionStore } from "../../../src/application/connection-store.mjs";

export const GET = withUser(async function GET(request, { user }) {
  const store = createConnectionStore().forUser(user.id);
  const connections = {};
  for (const provider of ["meta", "shopify", "tiktok"]) {
    const connection = await store.get(provider);
    connections[provider] = {
      connected: Boolean(connection?.accessToken) && connection?.status !== "REAUTHORIZE_REQUIRED",
      status: connection?.status ?? (connection?.accessToken ? "CONNECTED" : "NOT_CONNECTED"),
      name: provider === "shopify" ? connection?.store?.name ?? connection?.shop ?? null : connection?.setup?.adAccount?.name ?? null,
      connectedAt: connection?.connectedAt ?? null,
      ...(provider === "shopify" ? { shop: connection?.shop ?? null, currency: connection?.store?.currency ?? null, storefrontUrl: connection?.store?.storefrontUrl ?? null } : {}),
    };
  }
  return Response.json({ connections });
});

export const DELETE = withUser(async function DELETE(request, { user }) {
  const { provider } = await request.json();
  if (!["meta", "shopify", "tiktok"].includes(provider)) return Response.json({ error: "Choose a supported connection." }, { status: 400 });
  await createConnectionStore().forUser(user.id).delete(provider);
  return Response.json({ success: true });
});
