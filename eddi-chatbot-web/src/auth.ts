
const CLIENT_ID =  '0oa2dd3whs32kYBHa0h8';
const ISSUER =  'https://citizensbankdev.oktapreview.com/oauth2/default';
const OKTA_TESTING_DISABLEHTTPSCHECK =  false;
const BASENAME = import.meta.env.BASE_URL || '';
// BASENAME includes trailing slash
const REDIRECT_URI = `https://dbq-dev-chatbot.p2.ocp.citizensbank.com/auth/callback`;

export default {
  oidc: {
    clientId: CLIENT_ID,
    issuer: ISSUER,
    redirectUri: REDIRECT_URI,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    pkce: true,
    disableHttpsCheck: OKTA_TESTING_DISABLEHTTPSCHECK,
  },
  app: {
    basename: BASENAME,
  },
};
