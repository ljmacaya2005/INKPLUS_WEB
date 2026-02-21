
const SUPABASE_URL = 'https://atdpsopfgaewwxgxgfmy.supabase.co';
window.SUPABASE_URL = SUPABASE_URL;

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHBzb3BmZ2Fld3d4Z3hnZm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU2MjMsImV4cCI6MjA4NzA4MTYyM30.H8Ur0dwyL_XyfFfNcGm40T19bs-9KjA2cNkuT3wOtOU';
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// WARNING: Exposing Service Role Key on client-side is a security risk. Only use in trusted internal environments.
const SUPABASE_SERVICE_KEY = '';
// window.SUPABASE_SERVICE_KEY is intentionally omitted to force manual input for security.

// Shared Key for Password Encryption (AES) - Ensure this matches across Login and Users if separated.
// This key is used for client-side encryption of sensitive data like reset passwords.
const APP_ENCRYPTION_KEY = 'inkplus_secure_pass_key_2024';
window.APP_ENCRYPTION_KEY = APP_ENCRYPTION_KEY;

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
