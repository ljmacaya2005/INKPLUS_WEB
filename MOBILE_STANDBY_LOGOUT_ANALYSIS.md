# 📵 Architecture Deep Dive: Mobile Standby & False-Logout Anomaly

## 🚨 The Core Issue (Standby Bug)
A critical session stability anomaly was reported: Users accessing INKPlus via mobile devices (iPhone, Android) were experiencing forced logouts whenever they locked their screens, placed their phone in their pocket, or let the dashboard tab idle in the background.

This behavior technically broke the native caching architecture and made remote, field-operations nearly impossible.

---

## 🔍 Forensic Code Analysis (Root Cause)

Upon dissecting the global security logic inside `js/dashboard.js` and `js/sessions.js`, the exact conflict was identified within the **Session Guard Continuous Heartbeat** (which polls the Supabase Cloud every 15 seconds).

### 1. The Original (Flawed) Kill-Switch
The original logic running on the client-side continuously checked the following database parameter to verify if an Administrator had manually executed a session termination:

```javascript
// Old Logic running every 15 seconds inside dashboard.js
const { data } = await window.sb.from('users').select('is_online');
if (data.is_online === false) {
    // FORCE LOGOUT AND REDIRECT TO LOGIN!
    window.location.replace('index.html'); 
}
```

### 2. The Conflict
The `is_online` status inside the `users` table is not exclusively controlled by the Administrator. It is natively tied to Supabase's Realtime Presence network. Meaning:
* When a user puts their phone in their pocket or switches to another app, mobile browsers (like Safari and Chrome) instantly freeze the websocket connection to save battery life.
* The moment the connection freezes, Supabase automatically (and correctly) drops the `is_online` status to `false` because the user is no longer actively interacting with the window.
* **The glitch triggers here:** When the user wakes up their phone moments later, the `dashboard.js` interval resumes, detects that `is_online == false`, completely misinterprets this as a manual Administrator attack/disconnect, and forcefully nukes the user's local session.

---

## 🛠️ The Architectural Overhaul

To resolve this seamlessly, we needed to untangle the "Currently Idle" state from the "Forced Administrative Disconnect" state. We utilized the **`login_sessions` table**, which was exactly designed for this level of heavy session state-management.

### Phase 1: Upgrading the Administrator Control Module (`sessions.js`)
Previously, when the super-user clicked **"Disconnect"** on the Sessions Table, the network only updated one rule: `users.is_online = false`. 
We modified the system so that an Administrator's kill-order actually hunts down the user's explicit token registry and destroys it natively by stamping an exact `ended_at` timestamp.

```javascript
// New Sessions.js Logic (Double-Tap Execution)
// 1. Mark visually offline on the admin grid
await sb.from('users').update({ is_online: false }).eq('user_id', target);

// 2. Terminate the actual login_session records natively
await sb.from('login_sessions').update({ ended_at: new Date().toISOString() });
```

### Phase 2: Upgrading the Client Defense Drone (`dashboard.js`)
We stripped out the flawed `is_online === false` dependency entirely from the `setInterval` heartbeat. The client drone now individually checks its own unique `session_record_id` against the server. 

```javascript
// New Dashboard.js Logic 
// Look up our specific session row to see if an Admin forcibly added an ended_at date while we were asleep
const { data: sessData } = await sb.from('login_sessions').select('ended_at').eq('id', sessionId);

if (sessData && sessData.ended_at !== null) {
    // THIS IS A TRUE ADMINISTRATOR KILL COMMAND.
    // EXECUTE FULL LOGOUT SEQUENCE.
    await sb.auth.signOut();
    localStorage.clear();
}
```

## 🏁 Conclusion
The system successfully bridges modern mobile functionality with military-grade administrative enforcement, completely resolving the standby logout glitch while preserving instant-kill authority for master users.
