import Cookies from 'js-cookie';

// Set an auth cookie
export const setAuthCookie = (name, value, options = {}) => {
    Cookies.set(name, value, { 
        expires: 7,
        secure: true,
        sameSite: 'none',
        path: '/',
        ...options,
    });
};

// Clear all auth-related cookies
export const clearAuthCookies = () => {
    const cookies = Cookies.get();

    // Clear specific cookies
    ['token', 'user'].forEach((name) => {
        Cookies.remove(name, { path: '/' });
    });

    // Clear any residual Google/other auth cookies
    Object.keys(cookies).forEach((cookieName) => {
        if (cookieName.startsWith('g_') || cookieName.includes('auth') || cookieName.includes('token')) {
            Cookies.remove(cookieName, { path: '/' });
        }
    });
};
