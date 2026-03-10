# 🧪 Once Mobile: E2E Testing Guide

This guide walks you through testing the core security and authentication flow, now connected to the **live Render backend**.

---

## 🏗️ Preparation
1.  **Clear App Data** (Optional/Recommended for fresh start):
    -   If you have already performed the "Ritual" in a previous version, you might want to start fresh.
    -   You can manually clear the app cache/data in Android settings or uninstall/reinstall the Expo Go app to clear `SecureStore`.
2.  **Ensure Internet Access**: The app now talks to `https://once-app-qdwh.onrender.com`.

---

## 1️⃣ Phase 1: The Security Ritual
**Goal**: Generate your device's unique identity keys.

-   **Action**: Open the app. You should be automatically redirected to the **"The Ritual"** screen (with the ◎ icon).
-   **Interaction**: Press and hold the crest.
-   **Expectations**:
    -   **Success**: 
        -   Progress bar fills with haptic "ticks".
        -   Status changes: *Gathering Entropy* -> *Forging Identity* -> *Sealing Vault* -> *Identity Sealed*.
        -   The app will automatically transition to the **Vault** screen (it moves fast!).
    -   **Failure**: 
        -   If keys can't be saved (rare), the status will show *Ritual Failed*.

---

## 2️⃣ Phase 2: Vault Authentication (Signup)
**Goal**: Link your device identity to a new account.

-   **Action**: On the Vault screen, tap **"Forge New"** at the bottom to switch to the Registration form.
-   **Interaction**: Enter a new Email and Password, then tap **REGISTER**.
-   **Expectations**:
    -   **Success**:
        -   The "UNLOCK" button shows a loading spinner.
        -   Your device sends the **Public Key** from Phase 1 to the server.
        -   The server creates your account and registers this device.
        -   You will be redirected to the **Main App (Tabs)**.
    -   **Failure (Email Taken)**:
        -   Status shows: `EMAIL_ALREADY_IN_USE` in the red error text.
    -   **Failure (Invalid Input)**:
        -   Status shows a specific validation error (e.g., "Invalid email format").
    -   **Failure (Identity Missing)**:
        -   If you skipped the ritual somehow, it will say "Identity keys missing".

---

## 3️⃣ Phase 3: Vault Authentication (Login)
**Goal**: Access an existing account from this device.

-   **Action**: Ensure state is set to **"Unlock Vault"**.
-   **Interaction**: Enter your existing Email and Password, then tap **UNLOCK**.
-   **Expectations**:
    -   **Success**:
        -   You are redirected to the **Main App (Tabs)**.
    -   **Failure (Wrong Credentials)**:
        -   Status shows: `INVALID_CREDENTIALS` or "Vault access denied".
    -   **Failure (Server Down)**:
        -   Status shows: "Hey! Something went wrong." (The generic Render/Server error).

---

## 4️⃣ Phase 4: Persistence Testing
-   **Action**: Close the app and reopen it.
-   **Expectation**:
    -   If you logged in successfully, you should land directly on the **Tabs** screen (the Vault "remembers" you).
    -   If you never finished the Vault, you should land back on the **Vault** screen.
    -   If you never finished the Ritual, you should land back on **The Ritual**.

### 🛠️ Troubleshooting
If you hit a blank screen or a hang:
-   Check the **Metro Logs** in your terminal. Look for `[Layout]` tags.
-   Render "Cold Starts": On the first request of the day, Render might take 30-60 seconds to "wake up". If the first login/register takes a while, this is likely why.
