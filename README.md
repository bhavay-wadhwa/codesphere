# CodeSphere

CodeSphere is a collaborative coding space with rooms, live code updates, chat, code execution, profile management, email/password accounts, OTP verification, password reset, and Google sign-in.

## Run locally

1. Copy the example environment files:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

2. Fill in `backend/.env`:

   - `MONGODB_URL` and a long random `JWT_SECRET` are required to start the API.
   - `MAIL_*` values are required for signup OTPs and password-reset emails.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` enable Google sign-in.
   - `CLOUDINARY_*` values enable profile-photo uploads.

   Put the same Google client ID in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`. The client secret must only be in `backend/.env`.

3. Install and run both applications in separate terminals:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`.

## Configure email delivery

The server now returns an error instead of falsely showing “OTP sent” when SMTP is missing or rejects a message. Configure a real SMTP provider before testing signup. For Gmail, enable 2-Step Verification, create an App Password, and use:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-gmail-address@gmail.com
MAIL_PASS=your-16-character-app-password
MAIL_FROM=CodeSphere <your-gmail-address@gmail.com>
```

Use a provider such as Brevo, Postmark, Resend SMTP, or your own domain SMTP for production email rather than a personal mailbox.

## Configure Google sign-in

1. In Google Cloud Console, configure the OAuth consent screen and create an **OAuth client ID** of type **Web application**.
2. Add these Authorized JavaScript origins:
   - `http://localhost:5173`
   - your deployed app origin, for example `https://codesphere.onrender.com`
3. Copy its client ID to both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, and copy its client secret to `GOOGLE_CLIENT_SECRET` only.

The app uses Google’s authorization-code popup flow: the browser receives a one-time code and the server exchanges it securely. No redirect URI is required for this popup configuration.

## Deploy as one Render web service

This repository contains a root [`render.yaml`](render.yaml) blueprint. It builds React, serves the resulting files from Express, and uses the same HTTPS origin for API, authentication cookies, and Socket.IO. That makes OTP signup, Google sign-in, room collaboration, chat, and profile updates work without cross-site cookie workarounds.

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository. Render finds `render.yaml` automatically.
3. During setup, supply the prompted secret values:
   - `MONGODB_URL` — a MongoDB Atlas connection string
   - all `MAIL_*` values
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `VITE_GOOGLE_CLIENT_ID`
   - all `CLOUDINARY_*` values
4. Render generates `JWT_SECRET`, builds both projects, then provides the live `https://…onrender.com` URL. Add that URL to Google’s Authorized JavaScript origins and redeploy once.
5. Visit `/health` on the live URL, then test: email signup and OTP receipt, Google signup, reset-password email, a profile image upload, and a room opened by two users.

Never commit `.env` files or OAuth/SMTP/Cloudinary credentials. The required values are deliberately prompted by the Blueprint rather than stored in source control.
