// src/utils/googleAuthUrl.js
import { oauth2Client } from "./googleClient.js";

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const getGoogleAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // to get a refresh token as well
    prompt: "consent", // force the consent screen every time
    scope: scopes,
  });
};
