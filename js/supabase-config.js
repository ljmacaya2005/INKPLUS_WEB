
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

        // --- GLOBAL REAL-TIME SECURITY ENFORCER ---
        if (typeof window.initGlobalSecurityMonitor === 'function') {
            window.initGlobalSecurityMonitor();
        }

        return true;
    } else {
        console.log("Supabase SDK not found yet...");
        return false;
    }
}

if (!initSupabase()) {
    let retries = 0;
    const retryInt = setInterval(() => {
        if (initSupabase() || retries > 20) {
            clearInterval(retryInt);
            if (!window.sb) console.error("Failed to initialize Supabase after multiple attempts.");
        }
        retries++;
    }, 200);
}

// --- GLOBAL REAL-TIME SECURITY MONITOR ---
window.initGlobalSecurityMonitor = async function () {
    const isGate = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    const deviceId = window.getPersistentDeviceId();
    const userId = localStorage.getItem('user_id');
    const sessionId = localStorage.getItem('session_record_id');

    if (!window.sb) return;

    // 1. Terminal Authorization Guard (Persistent Real-Time)
    if (!isGate && deviceId) {
        window.sb
            .channel('terminal-security')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'ip_allowlist',
                filter: `device_id=eq.${deviceId}`
            }, (payload) => {
                const isRevoked = payload.eventType === 'DELETE' || (payload.new && payload.new.is_active === false);
                if (isRevoked) {
                    console.error("[Security] TERMINAL ACCESS REVOKED REAL-TIME.");
                    // Force complete purge
                    window.sb.auth.signOut();
                    localStorage.clear();
                    // Clear cookie too
                    document.cookie = "inkplus_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.replace('index.html');
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log("[Security] Terminal Monitor Active:", deviceId);
            });
    }

    // 2. Account & Session Guard (Only if logged in)
    if (userId && userId !== 'SYSTEM_SETUP_ID') {
        const userChannel = window.sb
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
                    forceLogout();
                }
            })
            .subscribe();

        // Watch for Session Termination
        if (sessionId) {
            const sessionChannel = window.sb
                .channel('session-security-guard')
                .on('postgres_changes', {
                    event: '*', // Listen to all changes (UPDATE/DELETE)
                    schema: 'public',
                    table: 'login_sessions',
                    filter: `id=eq.${sessionId}`
                }, (payload) => {
                    // Force logout if session marked as ended or deleted
                    const isEnded = payload.eventType === 'DELETE' || (payload.new && payload.new.ended_at !== null);
                    if (isEnded) {
                        console.error("[Security] SESSION TERMINATED REAL-TIME.");
                        forceLogout();
                    }
                })
                .subscribe();
        }
    }

    // --- RECOVERY HELPER ---
    async function forceLogout() {
        if (window.sb) {
            try {
                await window.sb.auth.signOut();
            } catch (e) { }
        }
        localStorage.clear();
        // Clear device registration cookie only if terminal revoked
        // window.location.replace('index.html');
        // Let's use a more direct approach
        window.location.href = 'index.html?reason=security_revoked';
    }

    // 3. Fail-Safe Security Heartbeat (Fallback Polling)
    // Every 10 seconds, do a hard check to ensure RLS/Security policies are still met
    // This catches scenarios where the Realtime websocket might have dropped or isn't enabled.
    setInterval(async () => {
        if (!userId || userId === 'SYSTEM_SETUP_ID') return;

        try {
            // Check terminal status
            if (deviceId) {
                const { data: terminal } = await window.sb.from('ip_allowlist').select('is_active').eq('device_id', deviceId).maybeSingle();
                if (!terminal || !terminal.is_active) {
                    console.warn("[Security] Heartbeat: Terminal revoked.");
                    forceLogout();
                    return;
                }
            }

            // Check User status
            const { data: user } = await window.sb.from('users').select('is_active, is_online').eq('user_id', userId).single();
            if (!user || user.is_active === false || user.is_online === false) {
                console.warn("[Security] Heartbeat: User suspended or disconnected.");
                forceLogout();
                return;
            }

            // Check Session status
            if (sessionId) {
                const { data: session } = await window.sb.from('login_sessions').select('ended_at').eq('id', sessionId).maybeSingle();
                if (!session || session.ended_at !== null) {
                    console.warn("[Security] Heartbeat: Session ended.");
                    forceLogout();
                    return;
                }
            }
        } catch (err) {
            // If the query itself fails with a 401/403 (due to RLS if we're unauthorized), it's a security signal
            if (err.status === 401 || err.status === 403 || (err.message && err.message.includes('permission denied'))) {
                console.warn("[Security] Heartbeat: Permission denied.");
                forceLogout();
            }
        }
    }, 10000); // 10 second polling fallback
};

