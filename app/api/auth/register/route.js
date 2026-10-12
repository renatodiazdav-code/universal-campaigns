import { createAuthService } from "../../../../src/application/auth-service.mjs";
import { assertSameOrigin, sessionCookie, authErrorResponse, readAuthInput } from "../../../../src/application/auth-http.mjs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const { user, token } = await createAuthService().register(await readAuthInput(request));
    return Response.json({ user }, { status: 201, headers: { "Set-Cookie": sessionCookie(token, request), "Cache-Control": "no-store" } });
  } catch (error) { return authErrorResponse(error); }
}
