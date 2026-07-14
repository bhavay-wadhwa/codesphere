import { google } from "googleapis";

export const isGoogleOAuthConfigured = () => Boolean(
    (process.env.GOOGLE_CLIENT_ID || process.env.Google_Client_id)
    && (process.env.GOOGLE_CLIENT_SECRET || process.env.Google_secret_key),
);

export const getGoogleOAuthClient = () => new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || process.env.Google_Client_id,
    process.env.GOOGLE_CLIENT_SECRET || process.env.Google_secret_key,
    "postmessage",
);
