
const SUPABASE_URL = 'https://atdpsopfgaewwxgxgfmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHBzb3BmZ2Fld3d4Z3hnZm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU2MjMsImV4cCI6MjA4NzA4MTYyM30.H8Ur0dwyL_XyfFfNcGm40T19bs-9KjA2cNkuT3wOtOU';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// PRIVILEGED ACCESS (Used for Auth Admin actions)
// We keep this in a private scope and do NOT bind it to window.SUPABASE_SERVICE_KEY
const _INTERNAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHBzb3BmZ2Fld3d4Z3hnZm15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUwNTYyMywiZXhwIjoyMDg3MDgxNjIzfQ.8VFEz7UK8F-nTsOM4pVjeMT3N8ILnTPBbxP9qh8uDR0';

/**
 * Creates a high-privilege Supabase client for administrative tasks.
 * NOTE: This client bypasses RLS and should be used with extreme caution.
 */
window.getSupabaseAdmin = () => {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        return supabase.createClient(SUPABASE_URL, _INTERNAL_SERVICE_KEY);
    } else if (window.supabase && window.supabase.createClient) {
        return window.supabase.createClient(SUPABASE_URL, _INTERNAL_SERVICE_KEY);
    }
    return null;
};

// Helper: Persistent Cookie Management
window.setCookie = (name, value, days = 365) => {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
};

window.getCookie = (name) => {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

// Helper: Unified Device Identity
window.getPersistentDeviceId = () => {
    let devId = window.getCookie('inkplus_device_id') || localStorage.getItem('inkplus_device_id');
    if (devId) {
        // Sync back to both storages if one is missing
        if (!window.getCookie('inkplus_device_id')) window.setCookie('inkplus_device_id', devId);
        if (!localStorage.getItem('inkplus_device_id')) localStorage.setItem('inkplus_device_id', devId);
    }
    return devId;
};

// Shared Key for Password Encryption (AES) - Ensure this matches across Login and Users if separated.
const APP_ENCRYPTION_KEY = 'inkplus_secure_pass_key_2024';
window.APP_ENCRYPTION_KEY = APP_ENCRYPTION_KEY;

// Security Gate Key for Terminal Authorization (QR / Manual Token)
const SECURITY_KEY = 'inkplus-gate-key-2024';
window.SECURITY_KEY = SECURITY_KEY;

window.sb = null;

// --- GLOBAL RECOVERY HELPER ---
window.forceLogout = async function (wipeTerminal = false, customTarget = null) {
    console.warn("[Security] System Disconnect Protocol: ACTIVATED. WipeTerminal:", wipeTerminal);

    // Get terminal ID before wipe if we need to preserve it
    const deviceId = window.getPersistentDeviceId();

    // 1. Wipe local data
    localStorage.clear();
    sessionStorage.clear();

    // 2. Restore Terminal ID if NOT wiping
    if (!wipeTerminal && deviceId) {
        localStorage.setItem('inkplus_device_id', deviceId);
        window.setCookie('inkplus_device_id', deviceId);
    }

    // 3. Kill cookies only if wiping
    if (wipeTerminal) {
        document.cookie = "inkplus_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // 4. Kill the Supabase Auth session
    if (window.sb) {
        try { await window.sb.auth.signOut(); } catch (e) { }
    }

    // 5. Hard destructive redirect
    const target = customTarget || (wipeTerminal ? 'index.html' : 'login.html');
    window.location.replace(`${target}?reason=security_event&t=${Date.now()}`);
};

// --- GLOBAL REAL-TIME SECURITY MONITOR ---
window.initGlobalSecurityMonitor = async function () {
    const path = window.location.pathname;
    const isGate = path.endsWith('index.html') || path === '/' || path.endsWith('/');
    const isPublicTracker = path.endsWith('tracker.html');

    // Whitelist public pages from terminal enforcement
    const isPublicPage = isGate || isPublicTracker;

    const deviceId = window.getPersistentDeviceId();
    const userId = localStorage.getItem('user_id');
    const sessionId = localStorage.getItem('session_record_id');

    if (!window.sb) return;

    // --- A. INITIAL SANITY CHECK (On Page Load) ---
    let terminalRecordId = null;
    if (!isPublicPage) {
        try {
            // 1. Terminal Check
            if (deviceId) {
                const { data: terminal } = await window.sb.from('ip_allowlist').select('id, is_active').eq('device_id', deviceId).maybeSingle();
                if (!terminal || !terminal.is_active) {
                    console.warn("[Security] Terminal unauthorized on load.");
                    const shouldWipe = !terminal; // Wipe only if record is GONE from DB
                    window.forceLogout(shouldWipe, 'index.html');
                    return;
                }
                terminalRecordId = terminal.id;
            } else {
                console.warn("[Security] No device ID found. Redirecting to gate.");
                window.location.replace('index.html');
                return;
            }

            // 2. Account & Session Check (If user is supposedly logged in)
            if (userId && userId !== 'SYSTEM_SETUP_ID') {
                const { data: user } = await window.sb.from('users').select('is_active, is_online').eq('user_id', userId).maybeSingle();
                if (!user || user.is_active === false) {
                    console.warn("[Security] User account revoked on load.");
                    window.forceLogout(false);
                    return;
                }
            }
        } catch (e) {
            console.error("[Security] Initial monitor check failed:", e);
        }
    }

    // --- B. PERSISTENT REAL-TIME MESH ---

    // 1. Terminal Authorization Guard (Persistent Real-Time)
    if (!isPublicPage && terminalRecordId) {
        window.sb
            .channel('terminal-security')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'ip_allowlist',
                filter: `id=eq.${terminalRecordId}`
            }, (payload) => {
                const isDeleted = payload.eventType === 'DELETE';
                const isSuspended = payload.new && payload.new.is_active === false;

                if (isDeleted) {
                    console.error("[Security] TERMINAL DELETED REAL-TIME.");
                    window.forceLogout(true, 'index.html');
                } else if (isSuspended) {
                    console.error("[Security] TERMINAL SUSPENDED REAL-TIME.");
                    window.forceLogout(false, 'index.html');
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log("[Security] Terminal Monitor Active:", deviceId);
            });
    }

    // 2. Account & Session Guard (Only if logged in)
    if (userId && userId !== 'SYSTEM_SETUP_ID') {
        window.sb
            .channel('user-security-guard')
            .on('postgres_changes', {
                event: '*', // Listen to all changes (UPDATE/DELETE)
                schema: 'public',
                table: 'users',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                const isSuspended = payload.eventType === 'DELETE' || (payload.new && payload.new.is_active === false);
                const isDisconnected = payload.new && payload.new.is_online === false;

                if (isSuspended || isDisconnected) {
                    console.error("[Security] ACCESS REVOKED OR DISCONNECTED REAL-TIME.");
                    window.forceLogout(false);
                }
            })
            .subscribe();

        // Watch for Session Termination
        if (sessionId) {
            window.sb
                .channel('session-security-guard')
                .on('postgres_changes', {
                    event: '*', // Listen to all changes (UPDATE/DELETE)
                    schema: 'public',
                    table: 'login_sessions',
                    filter: `id=eq.${sessionId}`
                }, (payload) => {
                    const isEnded = payload.eventType === 'DELETE' || (payload.new && payload.new.ended_at !== null);
                    if (isEnded) {
                        console.error("[Security] SESSION TERMINATED REAL-TIME.");
                        window.forceLogout(false);
                    }
                })
                .subscribe();
        }
    }

    // --- GLOBAL SECURITY PERIMETER ---
    window.securityPerimeter = window.sb.channel('security-perimeter');
    window.securityPerimeter
        .on('broadcast', { event: 'TERMINATE_SESSION' }, (payload) => {
            const pk = payload.payload;
            const myId = localStorage.getItem('user_id');
            const mySessId = localStorage.getItem('session_record_id');
            if (!pk) return;

            const isMe = pk.userId === myId || (pk.sessionId && pk.sessionId == mySessId);
            const isGlobalPurge = (pk.userId === 'ALL_EXCEPT_OWNER' || pk.userId === 'ALL') && pk.initiatorId !== myId;

            if (isMe || isGlobalPurge) {
                console.error("[Security] REMOTE TERMINATION SIGNAL RECEIVED.");
                window.forceLogout(false);
            }
        })
        .subscribe();
}

function initSupabase() {
    let client = null;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (client) {
        window.sb = client;
        console.log("Supabase Initialized Successfully");
        window.initGlobalSecurityMonitor();
        return true;
    }
    return false;
}

if (!initSupabase()) {
    let retries = 0;
    const retryInt = setInterval(() => {
        if (initSupabase() || retries > 20) {
            clearInterval(retryInt);
        }
        retries++;
    }, 200);
}

