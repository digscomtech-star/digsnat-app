// ============================================
// DIGSNAT CONFIGURATION
// ============================================

// Supabase Configuration - REPLACE WITH YOUR CREDENTIALS
const SUPABASE_URL = 'https://onngiubkvgawaovrndua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubmdpdWJrdmdhd2FvdnJuZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzAxMjgsImV4cCI6MjA5MDMwNjEyOH0.UeIBdiKcwvpVJkhuaLUgAT61UxOM_syvfzrJmoKuK1U';

// Initialize Supabase client
let supabaseClient;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Register Service Worker for PWA
    registerServiceWorker();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

async function createNotification(userId, message, role = null) {
    const { error } = await supabaseClient
        .from('notifications')
        .insert([{
            user_id: userId,
            message: message,
            role: role,
            read: false,
            created_at: new Date().toISOString()
        }]);
    
    if (error) console.error('Notification error:', error);
}

async function createNotificationForAdmins(job) {
    // Notify regional admin for the job's state
    const { data: admins } = await supabaseClient
        .from('staff')
        .select('*')
        .eq('role', 'regional_admin')
        .eq('state', job.state);
    
    if (admins) {
        admins.forEach(admin => {
            createNotification(admin.id, `New job in ${job.state}: ${job.description?.substring(0, 50)}...`, 'regional_admin');
        });
    }
}

let notificationInterval;

function startNotificationPolling() {
    fetchNotifications();
    notificationInterval = setInterval(fetchNotifications, 5000);
}

async function fetchNotifications() {
    const session = JSON.parse(localStorage.getItem('user_session'));
    if (!session) return;

    const { data: notifications } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', session.id)
        .eq('read', false)
        .order('created_at', { ascending: false });

    const badge = document.getElementById('notifCount');
    if (badge) {
        badge.textContent = notifications?.length || 0;
        badge.style.display = notifications?.length > 0 ? 'flex' : 'none';
    }
}

// ============================================
// CHAT SYSTEM
// ============================================

let currentChatJobId = null;
let chatInterval = null;

function openChat(jobId, otherUserId) {
    currentChatJobId = jobId;
    document.getElementById('chatModal').style.display = 'flex';
    loadMessages();
    chatInterval = setInterval(loadMessages, 3000);
}

function closeChat() {
    document.getElementById('chatModal').style.display = 'none';
    if (chatInterval) clearInterval(chatInterval);
    currentChatJobId = null;
}

async function loadMessages() {
    if (!currentChatJobId) return;

    const session = JSON.parse(localStorage.getItem('user_session'));
    
    const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('job_id', currentChatJobId)
        .order('created_at', { ascending: true });

    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    if (messages) {
        messages.forEach(msg => {
            const isMe = msg.sender_id === session.id;
            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isMe ? 'me' : 'them'}`;
            bubble.innerHTML = `
                <p>${msg.message}</p>
                <span class="time">${new Date(msg.created_at).toLocaleTimeString()}</span>
            `;
            container.appendChild(bubble);
        });
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || !currentChatJobId) return;

    const session = JSON.parse(localStorage.getItem('user_session'));
    
    await supabaseClient.from('messages').insert([{
        job_id: currentChatJobId,
        sender_id: session.id,
        message: message,
        created_at: new Date().toISOString()
    }]);

    input.value = '';
    loadMessages();
}

// Enter key to send
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('chatInput') === document.activeElement) {
        sendMessage();
    }
});

// ============================================
// LOGGING
// ============================================

async function logAction(action, status, details = null) {
    await supabaseClient.from('logs').insert([{
        action: action,
        status: status,
        details: details,
        created_at: new Date().toISOString()
    }]);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
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
