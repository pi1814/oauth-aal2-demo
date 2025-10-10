# Ory Hydra OAuth2 Custom UI Example (Node.js)

> **Disclaimer:** This demo project was solely possible due to multiple awesome projects. See references.

This repository demonstrates a complete OAuth2 authentication flow using [Ory Hydra](https://www.ory.sh/hydra) as the authorization server, with custom Node.js applications for both the OAuth2 client and the login/consent UI.

## Architecture

- **Ory Hydra**: OAuth2 server (token issuance, validation, flows)
- **Login & Consent App**: Node.js app for user authentication and consent screens
- **Client App**: Node.js app that authenticates users via OAuth2

## Folder Structure

```
OAuth2-AAL2-Demo/
  identity-provider/      # Hydra & Kratos config, custom login/consent UI
  client-app/             # OAuth2 client app (Express)
```

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js (v12+)
- Git

### 2. Hydra & Kratos Setup

```sh
docker compose -f identity-provider/quickstart.yml up --build
```

Hydra runs on:
- Public: `http://0.0.0.0:4444`
- Admin: `http://0.0.0.0:4445`

Kratos runs on:
- Public: `http://0.0.0.0:4433`
- Admin: `http://0.0.0.0:4434`

Custom UI runs on:
- `http://0.0.0.0:4455`

### 3. Create OAuth2 Client

```sh
docker exec -it identity-provider-hydra-1 hydra create oauth2-client --endpoint http://0.0.0.0:4445 --redirect-uri http://0.0.0.0:4000/callback  --name "My Node.js App" --grant-type authorization_code,refresh_token --response-type code --scope openid,offline_access,email'
```

Copy the `CLIENT_ID` & `CLIENT_SECRET` into `client-app/.env`.

### 4. Client App

```sh
cd client-app
npm install
npm start
```

Runs on: `http://0.0.0.0:4000`

### 5. Test the Flow

1. Go to `http://0.0.0.0:4000`
2. Click "Login with OAuth2"
3. Register/login at the custom UI (`http://0.0.0.0:4455`)
4. Grant consent
5. Redirected back to client app with access token

## Security & Production Notes

- Use HTTPS in production
- Set secure session secrets
- Enable rate limiting and CSRF protection
- Use managed PostgreSQL for Hydra
- See guide for advanced topics: PKCE, custom scopes, token validation, logging

## References

- [Ory Kratos & Hydra Integration](https://github.com/shodgson/ory-kratos-hydra-integration-demo/tree/main)
- [Ory Kratos Self-Service UI Node.js](https://github.com/ory/kratos-selfservice-ui-node)
- [Ory Kratos Self-Service UI React](https://github.com/ory/kratos-selfservice-ui-react-nextjs)

---

This project is a test project for OAuth2 authentication with custom UI using Ory Hydra and Node.js. Extend it for your own user management, social login, or advanced security needs.