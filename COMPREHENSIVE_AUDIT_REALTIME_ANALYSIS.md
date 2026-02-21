# ⚡ Architecture Deep Dive: Bulletproof Audit Real-Time & Event Signatures

## 🚨 The Challenge
Two critical issues were raised regarding the Audit Trail (`actions.html`):
1. The Real-Time WebSocket updates were failing to execute (causing delays or requiring manual refreshes).
2. The manual "Disconnect" action triggered by an Administrator against a sleeping user was erroneously showing up identically to standard "User Logged Out" actions, preventing security analysts from distinguishing between a voluntary sign-out and an administrative kick.

---

## 🛠️ Tactical Overhaul

### Sub-Routine A: Fixing The Real-Time Delay
By default, **Supabase PostgreSQL explicitly disables web-socket broadcasting (`realtime` replication setting) on all data tables** for security and server-performance reasons. Unless the Database Administrator manually logs into the Supabase Backend and flips the "Replication Toggle", the `actions.js` WebSocket code deployed previously is completely ignored by the server.

Because we cannot physically access the backend database toggles, we built an **Ultra-Lightweight Background Poller** inside `actions.js`, effectively bypassing the need for Cloud WebSockets entirely.

**The "Faux-Realtime" Execution Block:**
```javascript
setInterval(async () => {
    // 1. Ask the cloud: "What is the ID of the ONE most recent log?" (Extremely fast, near-zero cost)
    const { data } = await window.sb.from('audit_logs').select('log_id')
                    .order('trace_time', { ascending: false }).limit(1).single();

    // 2. Compare it against the HTML table on the screen
    if (data.log_id !== allLogs[0].log_id) { 
        // 3. Silently fetch new rows if mismatched!
        loadLogs(true);
    }
}, 2000); // Trigger every 2 seconds
```

By querying strictly the single top row `log_id` every 2 seconds, the performance cost is practically non-existent.

If a change is detected, we call `loadLogs(true)`. The new `true` parameter (**"Silent Mode"**) instructs the function to completely bypass wiping the `tbody` elements. It prevents the website from flashing the "Loading records..." screen every time it checks for updates, creating a flawless, instantaneous user experience.

---

### Sub-Routine B: Parsing Separation (Log Out vs Admin Kick)
Inside `sessions.js`, we rewrote the telemetry signature so it no longer mimics a regular logout.

**Previous Design:**
```javascript
window.logAction('SESSION_TERMINATED', 'user.security', ...) // Evaluates as "User Logged Out"
```

**New Design:**
```javascript
window.logAction('ADMIN_FORCED_DISCONNECT', 'user.security', ...) 
```

Once the new signature was implemented, we augmented the translator array inside `actions.js` (`mapSignature()`):
1. `ADMIN_FORCED_DISCONNECT` ➡️ **"Revoked User Session"**
2. `GLOBAL_SESSION_PURGE` ➡️ **"Purged All Active Sessions"**

## 🏁 Conclusion
The Audit Trail system is now operating at maximum responsiveness. Updates flash onto the screen seamlessly without a page reload within roughly 2 seconds of the event's execution globally. Furthermore, the explicit difference between a routine session closure and a forced security ejection is comprehensively visible inside the ledger.
