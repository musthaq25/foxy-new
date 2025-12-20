export const handler = async (event: any) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const host = event.headers.host || 'localhost:8888';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const REDIRECT_URI = `${protocol}://${host}/.netlify/functions/auth-google-callback`;

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: REDIRECT_URI,
    client_id: GOOGLE_CLIENT_ID!,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  const authUrl = `${rootUrl}?${qs.toString()}`;

  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
    },
  };
};