import { Configuration, FrontendApi, IdentityApi, OAuth2Api } from "@ory/client"

const baseUrlInternal =
  process.env.ORY_SDK_URL || "https://playground.projects.oryapis.com"

const apiBaseFrontendUrlInternal =
  process.env.KRATOS_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_KRATOS_PUBLIC_URL || 
  baseUrlInternal
const apiBaseOauth2UrlInternal = 
  process.env.HYDRA_ADMIN_URL ||
  process.env.NEXT_PUBLIC_HYDRA_ADMIN_URL || 
  baseUrlInternal

const apiBaseIdentityUrl = 
  process.env.KRATOS_ADMIN_URL ||
  process.env.NEXT_PUBLIC_KRATOS_ADMIN_URL || 
  baseUrlInternal

console.log('🔍 [Ory SDK Init]', {
  HYDRA_ADMIN_URL: apiBaseOauth2UrlInternal,
  KRATOS_PUBLIC_URL: apiBaseFrontendUrlInternal,
  KRATOS_ADMIN_URL: apiBaseIdentityUrl,
  usingPlayground: apiBaseOauth2UrlInternal === baseUrlInternal ? '⚠️ YES' : '✅ NO',
})

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_KRATOS_BROWSER_URL || apiBaseFrontendUrlInternal

// Sets up the SDK
const sdk = {
  basePath: apiBaseFrontendUrlInternal,
  frontend: new FrontendApi(
    new Configuration({
      basePath: apiBaseFrontendUrlInternal,
      baseOptions: {
        withCredentials: true,
      },
    }),
  ),
  oauth2: new OAuth2Api(
    new Configuration({
      basePath: apiBaseOauth2UrlInternal,
      ...(process.env.ORY_ADMIN_API_TOKEN && {
        accessToken: process.env.ORY_ADMIN_API_TOKEN,
      }),
      ...(process.env.MOCK_TLS_TERMINATION && {
        baseOptions: {
          "X-Forwarded-Proto": "https",
        },
      }),
    }),
  ),
  identity: new IdentityApi(
    new Configuration({
      basePath: apiBaseIdentityUrl,
      ...(process.env.ORY_ADMIN_API_TOKEN && {
        accessToken: process.env.ORY_ADMIN_API_TOKEN,
      }),
    }),
  ),
}

export default sdk
