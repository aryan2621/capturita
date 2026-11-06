# Google setup (YouTube and Drive uploads)

Capturita uploads with your own free Google Cloud project, so no shared key ships with the app. Your Client ID, Client Secret and sign-in token are stored in the macOS Keychain.

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project.
2. **APIs & Services → Library**: enable **YouTube Data API v3** and/or **Google Drive API**, whichever you upload to.
3. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and your email, and add yourself under **Test users**.
4. **Credentials → Create credentials → OAuth client ID**: set the application type to **Desktop app**.
5. Copy the **Client ID** and **Client secret** into Capturita: **Settings → Google**.
6. Click **Sign in**. Your browser opens Google's consent page and returns to a temporary local address (`127.0.0.1`).

Scopes requested: `openid`, `email`, plus `youtube.upload` or `drive.file` (only files Capturita creates).

While the consent screen is in **Testing**, Google expires the sign-in after 7 days; sign in again, or publish the consent screen to avoid this.
