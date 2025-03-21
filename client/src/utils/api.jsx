import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': "application/json"
    },
    withCredentials: true
});

api.interceptors.request.use(
    (config) => {
        const token = Cookies.get('token');
        
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh token yet
        if (error.response?.status === 401 && !originalRequest._retry && Cookies.get('refreshToken')) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh token
                const response = await api.post('/auth/refresh', {
                    refreshToken: Cookies.get('refreshToken')
                });

                const { token } = response.data;

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, clear all auth data and redirect to login
                Cookies.remove('token');
                Cookies.remove('refreshToken');
                Cookies.remove('user');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        // Handle blocked user or other auth errors
        if (error.response?.data?.action === 'LOGOUT') {
            Cookies.remove('token');
            Cookies.remove('refreshToken');
            Cookies.remove('user');
            window.location.href = '/';
        }

        return Promise.reject(error);
    }
);

export const authService = {
    register: async(formData) => {
        try {
            const response = await api.post('/auth/signup', formData)
            return response.data;
        } catch (error) {
            console.error('signup failed', error)
            throw error;
        }
    },
    login: async(credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
    logout: async () => {
        try {
            // 1. First revoke Google token if it exists
            if (window.google?.accounts?.id) {
                try {
                    const email = JSON.parse(Cookies.get('user'))?.email;
                    if (email) {
                        await window.google.accounts.id.revoke(email, () => {
                            console.log('Google Auth token revoked');
                        });
                    }
                    window.google.accounts.id.disableAutoSelect();
                } catch (error) {
                    console.error('Error revoking Google token:', error);
                }
            }
    
            // 2. Get the token before potentially removing it
            const token = Cookies.get('token');
            
            // 3. Logout API call BEFORE clearing cookies
            if (token) {
                await api.post('/auth/logout');
            }
    
            // 4. Clear all cookies systematically
            const domain = window.location.hostname;
            const paths = ['/', '/api', '/auth', ''];
            
            // Get all cookies
            const cookies = Cookies.get();
            
            // Clear each cookie across all paths
            paths.forEach(path => {
                // Clear specific auth cookies
                Cookies.remove('token', { path, domain });
                Cookies.remove('user', { path, domain });
                Cookies.remove('g_state', { path, domain });
                
                // Clear any cookies starting with g_ (Google related)
                Object.keys(cookies).forEach(cookieName => {
                    if (cookieName.startsWith('g_') || 
                        cookieName.includes('google') || 
                        cookieName.includes('auth') ||
                        cookieName.includes('token')) {
                        Cookies.remove(cookieName, { path, domain });
                        // Also try removing from root domain
                        Cookies.remove(cookieName, { path, domain: `.${domain}` });
                    }
                });
            });
    
            // 5. Clear cookies from root domain as well
            Cookies.remove('token', { domain: `.${domain}` });
            Cookies.remove('user', { domain: `.${domain}` });
            
            // 6. Clear any local/session storage
            localStorage.clear();
            sessionStorage.clear();
    
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            // Even if the API call fails, we still want to clear local data
            localStorage.clear();
            sessionStorage.clear();
            throw error;
        }
    },
    refreshToken: async () => {
        const response = api.post('/auth/refresh', {});
        return response.data;
    }
}

export const userService = {
    getPendingFriendRequests: async() => {
        try{
            const response = await api.get('/user/pending');
            return response.data;
        } catch (err) {
            console.error('failed to fetch', err)
            throw err
        }
    },
    searchUsers: async(query) => {     
        try{
            const response = await api.get(`/user/search/${query}`);
            return response.data;
        } catch (err) {
            console.error('failed to search', err)
            throw err
        }
    },
    sendFriendRequest: async(userId) => {
        try{
            const response = await api.post('/user/send-request', { recipientId: userId });
            return response.data
        } catch (err) {
            console.error('failed to send request', err)
            throw err
        }
    },
    fetchFriends: async () => {
        try {
            const response = await api.get('/user/contacts');
            return response.data;
        } catch (err) {
            console.error('failed to fetch friends',err);
            throw err;
        }
    },
    getFriendRequests: async () => {
        try {
            const response = await api.get('/user/requests');
            return response.data;
        } catch (err) {
            console.error('failed to fetch', err);
            throw err;
        }
    },
    getChats: async () => {
        const response = await api.get('/user/getchats');
        return response.data;
    },
    createChat: async (chatData) => {
        const response = await api.post('/user/create-chat',chatData);
        return response.data;
    },
    fetchMessages: async (chatId) => {
        const response = await api.get(`/user/chat/${chatId}`);
        return response.data;
    },
    createGroup: async (groupName, participants) => {
        try {
            const response = await api.post('/user/create-group',{groupName, participants})
            return response.data;
        } catch (err) {
            console.error('failed to create group', err);
            throw err;
        }
    },
}

export const friendService = {
    acceptRequest: async(senderId) => {
        try {
            const response = await api.post('/user/accept', {senderId} );
            return response.data;
        } catch (err) {
            console.error('failed to accept', err);
            throw err;
        }
    },
    rejectRequest: async(senderId) => {
        try {
            const response = await api.post('/user/reject', senderId);
            return response.data;
        } catch (err) {
            console.error('failed to reject', err);
            throw err;
        }
    }
}

export const notificationService = {
    getUserNotifications: async () => {
        try {
            const response = await api.get('/notification');
            return response.data;
        } catch (err) {
            console.error('failed to fetch notifications', err);
            throw err;
        }
    },
    getUnreadNotificationCount: async () => {
        try {
            const response = await api.get('/notification/unread/count');
            return response.data;
        } catch (err) {
            console.error('failed to fetch count',err);
            throw err;
        }
    },
    markNotificationsAsRead: async (notificationId) => {
        try {
            const response = await api.put('/notification/read', {notificationId});
            return response.data;
        } catch (err) {
            console.error('failed to mark', err);
            throw err;
        }
    },
    markAllNotificationsAsRead: async () => {
        try {
            const response = await api.put('/notification/read/all');
            return response.data;
        } catch (err) {
            console.error('failed to mark all', err);
            throw err;
        }
    },
    deleteNotification: async (notificationId) => {
        try {
            const response = await api.delete(`/otification/${notificationId}`);
            return response.data;
        } catch (err) {
            console.error('failed to delete',err);
            throw err;
        }
    }
}