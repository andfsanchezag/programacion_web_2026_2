# Backend CORS and Frontend Consumption SDD

## 1. Purpose

This document defines the backend acceptance policy for the React frontend and the security boundary for browser consumption of the API at `http://localhost:8080`.

## 2. Development origins

The backend must allow only the configured frontend development origin, by default:

```text
http://localhost:5173
```

The origin must be configurable through an environment variable such as `FRONTEND_ORIGIN`. Do not use `*` when credentials or authorization headers are involved.

Production origins must be explicitly configured and must not inherit development defaults.

## 3. CORS policy

Allowed configuration:

- `origin`: allow-list containing `FRONTEND_ORIGIN`.
- `methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- `allowedHeaders`: `Authorization, Content-Type, Accept, X-Request-Id`.
- `exposedHeaders`: `X-Request-Id`.
- `credentials`: `false` when JWT is sent in the `Authorization` header and tokens are not cookies.
- `optionsSuccessStatus`: `204` or the framework equivalent.
- Reject disallowed origins instead of reflecting arbitrary `Origin` headers.

If the implementation later moves JWT to secure HttpOnly cookies, `credentials` must become `true`, `Access-Control-Allow-Origin` must remain an explicit origin, and CSRF protection must be added.

## 4. Security requirements

- The frontend sends `Authorization: Bearer <token>` for protected endpoints.
- CORS does not replace JWT authentication or role authorization.
- The backend must not accept credentials, passwords or tokens through query parameters.
- Error responses follow `backendSDD/Adapters/Global-exception-handler.md` and must not expose stack traces or database details.
- `X-Request-Id` is accepted or generated and returned for support diagnostics.
- The backend must validate `Origin` according to the allow-list for browser requests.
- Rate limiting, HTTPS and secure secret configuration are required for production deployment.

## 5. Express profile

Register CORS before routes and before authentication-dependent route handling. The global exception handler remains after all routes.

Conceptual order:

```text
request id -> CORS -> JSON parser -> authentication middleware -> routes -> global error handler
```

The implementation may use the `cors` package or an equivalent adapter, but the behavior must match this contract.

## 6. Spring profile

Configure CORS through the Spring Security filter chain or a centralized `WebMvcConfigurer`. The allowed origins and headers must match this document. Preflight `OPTIONS` requests must be accepted without requiring a JWT, while protected business methods remain authenticated.

## 7. Acceptance tests

The backend gate must prove:

1. requests from `http://localhost:5173` receive the expected CORS headers;
2. preflight requests succeed for all documented methods and headers;
3. an unapproved origin is rejected or receives no permissive CORS headers;
4. protected requests without JWT return `401`;
5. protected requests with an incorrect role return `403`;
6. a valid JWT request from the approved origin reaches the endpoint;
7. error responses preserve the standard error envelope and `X-Request-Id`;
8. no wildcard origin is combined with authorization or credentials.
