# Figma OAuth App

A Next.js application demonstrating Figma OAuth authentication with PKCE flow, automatic token refresh, and localStorage persistence.

## Features

- ✅ Complete OAuth flow with PKCE and state verification
- ✅ Automatic token refresh 5 minutes before expiration
- ✅ User info display with copyable access token
- ✅ localStorage persistence across page refreshes
- ✅ Tailwind CSS styling
- ✅ Secure session management with iron-session

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env.local` file is already configured with the Figma OAuth credentials. **Important**: Update the `SESSION_SECRET` with a secure random string (minimum 32 characters):

```env
SESSION_SECRET=your_secure_random_32_character_string_here
```

You can generate a secure secret using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Login with Figma"
2. Authorize the application on Figma
3. You'll be redirected back with your user info displayed
4. Your access token will be shown (you can copy it)
5. Tokens are automatically refreshed before expiration
6. Click "Logout" to end the session

## Project Structure

```
figma-oauth-app/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Homepage
│   ├── globals.css                # Tailwind CSS
│   └── api/auth/
│       ├── figma/route.ts         # OAuth initiation
│       ├── callback/route.ts      # OAuth callback
│       ├── refresh/route.ts       # Token refresh
│       ├── session/route.ts       # Session info
│       └── logout/route.ts        # Logout
├── lib/
│   ├── auth.ts                    # OAuth utilities
│   ├── session.ts                 # Session config
│   ├── figma-client.ts            # Figma API client
│   └── types.ts                   # TypeScript types
├── components/
│   ├── LoginButton.tsx
│   ├── UserInfo.tsx
│   └── TokenDisplay.tsx
├── hooks/
│   ├── useAuth.ts                 # Auth state hook
│   └── useTokenRefresh.ts         # Auto refresh hook
└── .env.local                     # Environment variables
```

## Security Features

- **PKCE Flow**: Prevents authorization code interception
- **State Parameter**: CSRF protection during OAuth flow
- **HttpOnly Cookies**: Session tokens secure from XSS (via iron-session)
- **localStorage**: Used only for display purposes
- **Temporary Cookies**: Safely transfer tokens from server to client
- **Token Refresh**: Automatic refresh 5 minutes before expiration
- **Session Encryption**: iron-session uses AES-256-GCM

## Testing

### Test Login Flow
1. Visit http://localhost:3000
2. Click "Login with Figma"
3. Authorize on Figma
4. Verify user info and token display

### Test Token Display
1. After login, verify access token is visible
2. Click "Copy" button
3. Paste in text editor to verify token format

### Test localStorage Persistence
1. After login, open DevTools → Application → localStorage
2. Verify keys: `figma_access_token`, `figma_refresh_token`
3. Refresh page, verify still logged in

### Test Logout
1. Click "Logout" button
2. Verify redirected to login screen
3. Check localStorage and cookies cleared

### Test Token Refresh
1. Wait until 5 minutes before token expiration
2. Verify automatic refresh triggered
3. Check new token stored in localStorage

## API Endpoints

- `GET /api/auth/figma` - Initiates OAuth flow
- `GET /api/auth/callback` - Handles OAuth callback
- `POST /api/auth/refresh` - Refreshes access token
- `GET /api/auth/session` - Returns current session
- `POST /api/auth/logout` - Clears session

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FIGMA_CLIENT_ID` | Figma OAuth client ID |
| `FIGMA_CLIENT_SECRET` | Figma OAuth client secret |
| `FIGMA_REDIRECT_URI` | OAuth callback URL |
| `NEXTAUTH_URL` | Application base URL |
| `SESSION_SECRET` | Secret for session encryption (32+ chars) |
| `NODE_ENV` | Environment (development/production) |

## License

MIT
