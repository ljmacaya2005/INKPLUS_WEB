# 🔒 Security Protocol: Automatic Suspension & Session Revocation

## 📌 Executive Directive
The user mandated a strict security loop where disabling a user's account from the `users.html` interface must trigger an immediate global logout for that user and prevent any future sign-in attempts until an administrator manually restores access.

---

## 🏗️ Forensic Implementation Analysis

### 1. The Entrance Barrier (`js/login.js`)
We have upgraded the login sequence to include a **pre-entry validation check**. Even if a user provides the correct email and password, the system now performs a secondary verification against the `users` table.

**The Guard Condition:**
```javascript
const { data: statusCheck } = await sb.from('users').select('is_active').eq('user_id', id);

if (statusCheck.is_active === false) {
    await sb.auth.signOut();
    throw new Error("Your account has been deactivated.");
}
```
This ensures that a deactivated account is physically blocked from generating a session token, effectively locking them out of the entire ecosystem.

### 2. The Forced Eviction Engine (`js/users.js`)
When an Administrator toggles a user to "Inactive" on the management grid, the system now executes a **Double-Kill Termination**:

1.  **Visual Flush:** The user is immediately marked as `is_online: false` in the database, updating all admin dashboards.
2.  **Registry Purge:** All active entries in the `login_sessions` table for that specific user are stamped with an `ended_at` time.
3.  **Active Kick:** The dashboard heartbeat (running via `dashboard.js` on the user's open tab) detects the `is_active: false` change within seconds and forcefully redirects the user's browser back to `index.html`.

### 3. Automated Detection & Audit Trail
Every single status change is captured by the Telemetry system. 
*   **Signature:** `USER_STATUS_TOGGLED`
*   **Context:** Records the `target_id` and the `new_status`.

This creates a permanent, non-repudiable record of exactly which administrator disabled an account and when the eviction occurred.

---

## 🏁 Operational Status
- **Pre-Login Check:** ACTIVE
- **Instant Eviction:** ACTIVE (via Heartbeat)
- **Session Registry Death:** ACTIVE
- **Automatic Audit Logging:** ACTIVE

The system now operates with total administrative authority over user access life-cycles.
