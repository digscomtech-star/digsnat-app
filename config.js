// ==========================================
// DIGSNAT CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://onngiubkvgawaovrndua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubmdpdWJrdmdhd2FvdnJuZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzAxMjgsImV4cCI6MjA5MDMwNjEyOH0.UeIBdiKcwvpVJkhuaLUgAT61UxOM_syvfzrJmoKuK1U';

let supabaseClient;

async function initSupabase() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW error:', err));
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================

async function createNotification(userId, message, type = 'general') {
    await supabaseClient.from('notifications').insert([{
        user_id: userId,
        message: message,
        type: type,
        read: false,
        created_at: new Date().toISOString()
    }]);
}

// ==========================================
// IMAGE HELPERS
// ==========================================

function getImageUrl(bucket, path) {
    if (!path) return '/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ==========================================
// UTILITIES
// ==========================================

function generateToken(prefix = 'TKN') {
    return prefix + '_' + Math.random().toString(36).substring(2, 15).toUpperCase();
}

function formatCurrency(amount) {
    return '₦' + (amount || 0).toLocaleString();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ==========================================
// ERROR HANDLING
// ==========================================

window.onerror = function(msg, url, line) {
    console.error('Error:', msg, 'at', url + ':' + line);
    if (typeof supabaseClient !== 'undefined') {
        supabaseClient.from('logs').insert([{
            action: 'CLIENT_ERROR',
            status: 'ERROR',
            details: `${msg} at ${url}:${line}`,
            created_at: new Date().toISOString()
        });
    }
    return false;
};
