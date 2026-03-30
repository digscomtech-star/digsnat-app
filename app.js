// ============================================
// DIGSNAT MAIN APPLICATION
// ============================================

// Global state management
const App = {
    user: null,
    session: null,
    
    init() {
        this.restoreSession();
        this.setupEventListeners();
    },

    restoreSession() {
        const session = JSON.parse(localStorage.getItem('user_session'));
        if (session) {
            this.session = session;
            this.user = session;
        }
    },

    setupEventListeners() {
        // Close modals on outside click
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };
    },

    // Session persistence for PWA
    persistSession(userData) {
        localStorage.setItem('user_session', JSON.stringify({
            ...userData,
            timestamp: new Date().toISOString()
        }));
    },

    clearSession() {
        localStorage.removeItem('user_session');
        this.user = null;
        this.session = null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.session;
    },

    // Get current user role
    getRole() {
        return this.session?.role || null;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ============================================
// SECURITY HELPERS
// ============================================

// Sanitize input to prevent XSS
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Validate email format
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate Nigerian phone number
function isValidPhone(phone) {
    return /^(\+234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ''));
}

// ============================================
// IMAGE HANDLING
// ============================================

async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ============================================
// OFFLINE SUPPORT
// ============================================

const OfflineStore = {
    async save(key, data) {
        localStorage.setItem(`offline_${key}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    },

    async get(key) {
        const item = localStorage.getItem(`offline_${key}`);
        return item ? JSON.parse(item).data : null;
    },

    async clear(key) {
        localStorage.removeItem(`offline_${key}`);
    }
};

// Queue actions when offline
const ActionQueue = {
    async add(action) {
        const queue = JSON.parse(localStorage.getItem('action_queue') || '[]');
        queue.push({
            ...action,
            id: Date.now(),
            retries: 0
        });
        localStorage.setItem('action_queue', JSON.stringify(queue));
    },

    async process() {
        if (!navigator.onLine) return;
        
        const queue = JSON.parse(localStorage.getItem('action_queue') || '[]');
        if (queue.length === 0) return;

        const remaining = [];
        
        for (const action of queue) {
            try {
                // Process based on action type
                await processQueuedAction(action);
            } catch (error) {
                action.retries++;
                if (action.retries < 3) {
                    remaining.push(action);
                }
            }
        }

        localStorage.setItem('action_queue', JSON.stringify(remaining));
    }
};

async function processQueuedAction(action) {
    // Implementation depends on action type
    console.log('Processing queued action:', action);
}

// Listen for online status
window.addEventListener('online', () => {
    console.log('Back online - processing queue');
    ActionQueue.process();
});

// ============================================
// ERROR HANDLING
// ============================================

window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', { msg, url, line, col, error });
    
    // Log to Supabase
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

// ============================================
// PERFORMANCE MONITORING
// ============================================

if ('PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.log(`[Performance] ${entry.name}: ${entry.duration}ms`);
        }
    });
    perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
}
