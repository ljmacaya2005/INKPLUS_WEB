
const SUPABASE_URL = 'https://atdpsopfgaewwxgxgfmy.supabase.co';
window.SUPABASE_URL = SUPABASE_URL;

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHBzb3BmZ2Fld3d4Z3hnZm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU2MjMsImV4cCI6MjA4NzA4MTYyM30.H8Ur0dwyL_XyfFfNcGm40T19bs-9KjA2cNkuT3wOtOU';
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// WARNING: Exposing Service Role Key on client-side is a security risk. Only use in trusted internal environments.
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHBzb3BmZ2Fld3d4Z3hnZm15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUwNTYyMywiZXhwIjoyMDg3MDgxNjIzfQ.8VFEz7UK8F-nTsOM4pVjeMT3N8ILnTPBbxP9qh8uDR0';
window.SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY; // Temporarily hardcoded for user convenience

// Shared Key for Password Encryption (AES) - Ensure this matches across Login and Users if separated.
// This key is used for client-side encryption of sensitive data like reset passwords.
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
        // Runs on every page to ensure instant revocation detection
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
    const deviceId = localStorage.getItem('inkplus_device_id');
    const userId = localStorage.getItem('user_id');
    const sessionId = localStorage.getItem('session_record_id');

    if (!window.sb) return;

    // 1. Terminal Authorization Guard (Required for ALL pages except the Gate itself)
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
                    localStorage.clear();
                    window.location.replace('index.html');
                }
            })
            .subscribe();
    }

    // 2. Account & Session Guard (Only if logged in)
    if (userId && userId !== 'SYSTEM_SETUP_ID') {
        // Watch for User Suspension
        window.sb
            .channel('user-security')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (payload.new && payload.new.is_active === false) {
                    console.error("[Security] ACCOUNT SUSPENDED REAL-TIME.");
                    window.sb.auth.signOut();
                    localStorage.clear();
                    window.location.replace('index.html');
                }
            })
            .subscribe();

        // Watch for Session Termination
        if (sessionId) {
            window.sb
                .channel('session-security')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'login_sessions',
                    filter: `id=eq.${sessionId}`
                }, (payload) => {
                    if (payload.new && payload.new.ended_at !== null) {
                        console.error("[Security] SESSION TERMINATED REAL-TIME.");
                        window.sb.auth.signOut();
                        localStorage.clear();
                        window.location.replace('index.html');
                    }
                })
                .subscribe();
        }
    }
};
