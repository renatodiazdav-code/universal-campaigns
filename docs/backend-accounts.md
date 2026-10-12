# Backend accounts and storage

## Local use

Requires Node.js 24 or newer.

1. Run `npm run setup:local`. This writes a random encryption key and the local app URL to the ignored `.env.local` file without printing the key.
2. Start Relay with `npm run dev` and open `/login`.
3. Create an account. Registration starts a session and redirects to `/campaigns`.
4. To attach the previous developer connection, campaigns and development Shopify store to that account, run:

   `npm run migrate:legacy -- --email YOUR_REGISTERED_EMAIL`

The import keeps source files, skips already imported campaigns and does not overwrite an existing provider connection. It never assigns legacy data automatically to the first registrant. The Shopify import is a development bridge; merchants can now authorize their own stores through Shopify OAuth. See `docs/shopify-connection.md`.

## APIs

| Endpoint | Purpose |
|---|---|
| POST `/api/auth/register` | Name, email, password; creates account and session |
| POST `/api/auth/login` | Email and password; creates a fresh session |
| POST `/api/auth/logout` | Revokes the current session and clears its cookie |
| GET `/api/auth/me` | Returns the current user's public identity |
| GET `/api/connections` | Returns provider status and names, never tokens |
| DELETE `/api/connections` | Disconnects the named provider for the current user |

All business API routes require a session. Mutations require an `Origin` header matching `APP_URL`; CLI HTTP tests must supply it. Requests cannot select another user's identity through a body, URL or custom header.

Sessions use random opaque tokens; SQLite only stores SHA-256 token hashes. Passwords use salted scrypt. Cookies are HttpOnly and SameSite=Lax, with Secure and the __Host- cookie prefix enabled for HTTPS. Login/registration attempts are rate-limited and password derivation concurrency is bounded. Meta OAuth states expire after ten minutes, are single-use and bind to the initiating user and session.

Campaign rows are scoped to the owner in every read/write. Provider connection payloads are encrypted with AES-256-GCM, with the user/provider identity authenticated as associated data.

## Deployment constraints

- This SQLite adapter targets a single Node server with persistent disk. Use a persistent volume and backups; do not place it on an ephemeral or horizontally replicated filesystem. A hosted/serverless deployment needs a shared database adapter before launch.
- Production requires `APP_URL` and `RELAY_ENCRYPTION_KEY` configured on the server. `APP_URL` must use HTTPS outside localhost.
- Keep the encryption key unchanged and backed up separately. Losing it makes stored connections unreadable. No key rotation workflow is implemented yet.
- Update Meta's allowed OAuth redirect URI to `${APP_URL}/api/meta/auth/callback`.
- Email verification and password recovery are not implemented in this block. These endpoints are the account/session foundation for a controlled beta, not a complete public identity service.
- Legacy plaintext developer files remain only for the explicit import. HTTP routes never fall back to them. After verifying migration, handle those legacy credentials as local secrets.
