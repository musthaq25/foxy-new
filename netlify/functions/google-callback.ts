export const handler = async (event: any) => {
  const code = event.queryStringParameters.code;
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = 'https://foxyai1.netlify.app/.netlify/functions/google-callback';

  if (!code) {
    return { statusCode: 400, body: 'Authorization code missing' };
  }

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      console.error("Token Exchange Failed:", tokens);
      throw new Error('Token exchange failed');
    }

    // 2. Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userResponse.json();

    // 3. Prepare safe user object
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    // 4. Redirect back to frontend with data
    const protocol = event.headers.host.includes('localhost') ? 'http' : 'https';
    const redirectTarget = `${protocol}://${event.headers.host}/?auth_data=${encodeURIComponent(JSON.stringify(safeUser))}`;

    return {
      statusCode: 302,
      headers: {
        Location: redirectTarget,
      },
    };
  } catch (error: any) {
    console.error("Auth Callback Error:", error);
    return { statusCode: 500, body: error.message };
  }
};