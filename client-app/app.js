const express = require('express');
const session = require('express-session');
const { AuthorizationCode } = require('simple-oauth2');
const crypto = require('crypto');
require('dotenv').config();
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.error('Error: CLIENT_ID and CLIENT_SECRET environment variables must be set.');
  process.exit(1);
}

// OAuth2 client configuration
const oauth2Client = new AuthorizationCode({
  client: {
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'http://0.0.0.0:4444',
    tokenPath: '/oauth2/token',
    authorizePath: '/oauth2/auth',
  },
});

const cors = require('cors');
const csrfProtection = csrf({ cookie: false });

app.use(cors({
  origin: 'http://0.0.0.0',
  credentials: true
}));

app.use(cookieParser());

app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax',
    domain: '0.0.0.0',
    httpOnly: true
  },
  withCredentials: true
}));

// Helper function to generate HTML pages
const generatePage = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OAuth2 Demo Client</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 50px;
      max-width: 600px;
      width: 100%;
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      margin: 0 auto 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: white;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    h1 {
      color: #2d3748;
      font-size: 32px;
      margin-bottom: 15px;
      text-align: center;
      font-weight: 700;
    }

    .subtitle {
      color: #718096;
      text-align: center;
      margin-bottom: 40px;
      font-size: 16px;
      line-height: 1.6;
    }

    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 40px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      width: 100%;
      text-align: center;
      margin-top: 15px;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #4a5568;
      box-shadow: none;
      margin-top: 15px;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
      box-shadow: none;
    }

    .status {
      background: #f0fdf4;
      border: 2px solid #86efac;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: center;
    }

    .status-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }

    .status-text {
      color: #166534;
      font-weight: 600;
      font-size: 18px;
    }

    .info-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 25px;
      margin: 20px 0;
    }

    .info-label {
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .info-value {
      color: #1e293b;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      word-break: break-all;
      background: white;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .button-group {
      display: flex;
      gap: 15px;
      margin-top: 30px;
    }

    .button-group .btn {
      width: auto;
      flex: 1;
    }

    @media (max-width: 640px) {
      .container {
        padding: 30px 25px;
      }

      h1 {
        font-size: 26px;
      }

      .button-group {
        flex-direction: column;
      }

      .button-group .btn {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

// Routes
app.get('/', csrfProtection, (req, res) => {
  if (req.session.accessToken) {
    const content = `
      <div class="logo">🔐</div>
      <h1>Authentication Successful</h1>
      <p class="subtitle">You are now logged in and have access to protected resources</p>
      
      <div class="status">
        <div class="status-icon">✓</div>
        <div class="status-text">Session Active</div>
      </div>

      <div class="button-group">
        <a href="/profile" class="btn">View Profile</a>
        <a href="/logout" class="btn btn-secondary">Logout</a>
      </div>
    `;
    res.send(generatePage(content));
  } else {
    const content = `
      <div class="logo">🔑</div>
      <h1>OAuth2 Demo Client</h1>
      <p class="subtitle">Securely authenticate using OAuth2 protocol. Click below to begin the authentication process.</p>
      
      <a href="/auth" class="btn">Login with OAuth2</a>
    `;
    res.send(generatePage(content));
  }
});

app.get('/auth', csrfProtection, (req, res) => {
  const authorizationUri = oauth2Client.authorizeURL({
    redirect_uri: 'http://0.0.0.0:4000/callback',
    scope: 'openid offline_access email',
    state: crypto.randomBytes(16).toString('hex'),
    withCredentials: true
  });

  res.redirect(authorizationUri);
});

app.get('/callback', csrfProtection, async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    const content = `
      <div class="logo">❌</div>
      <h1>Authentication Failed</h1>
      <p class="subtitle">Authorization code is missing. Please try again.</p>
      <a href="/" class="btn">Back to Home</a>
    `;
    return res.status(400).send(generatePage(content));
  }

  try {
    const result = await oauth2Client.getToken({
      code,
      redirect_uri: 'http://0.0.0.0:4000/callback',
      scope: 'openid offline_access email',
      withCredentials: true
    });

    req.session.accessToken = result.token.access_token;
    req.session.refreshToken = result.token.refresh_token;
    req.session.idToken = result.token.id_token;

    res.redirect('/');
  } catch (error) {
    console.error('Token exchange error:', error);
    const content = `
      <div class="logo">⚠️</div>
      <h1>Authentication Error</h1>
      <p class="subtitle">We encountered an error during authentication. Please try again.</p>
      <a href="/" class="btn">Back to Home</a>
    `;
    res.status(500).send(generatePage(content));
  }
});

app.get('/logout', csrfProtection, (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/profile', csrfProtection, (req, res) => {
  if (!req.session.accessToken) {
    const content = `
      <div class="logo">🚫</div>
      <h1>Access Denied</h1>
      <p class="subtitle">You need to be authenticated to view this page.</p>
      <a href="/" class="btn">Go to Login</a>
    `;
    return res.status(401).send(generatePage(content));
  }

  const content = `
    <div class="logo">👤</div>
    <h1>Protected Resource</h1>
    <p class="subtitle">Your authentication tokens and session information</p>

    <div class="info-card">
      <div class="info-label">Access Token</div>
      <div class="info-value">${req.session.accessToken}</div>
    </div>

    ${req.session.idToken ? `
    <div class="info-card">
      <div class="info-label">ID Token</div>
      <div class="info-value">${req.session.idToken}</div>
    </div>
    ` : ''}

    <div class="button-group">
      <a href="/" class="btn btn-secondary">Back to Home</a>
      <a href="/logout" class="btn">Logout</a>
    </div>
  `;

  res.send(generatePage(content));
});

app.listen(port, () => {
  console.log(`Client app listening at http://0.0.0.0:${port}`);
});
