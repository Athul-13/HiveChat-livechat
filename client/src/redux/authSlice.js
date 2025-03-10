import Cookies from 'js-cookie'; 
import { clearAuthCookies, setAuthCookie } from '../utils/cookies';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authService } from '../utils/api';

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isAdmin: false,
};

const isTokenExpired = (token) => {
    const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
    return payload.exp * 1000 < Date.now();
};

// Load initial state from cookies
const loadFromCookies = () => {
    try {
        const token = Cookies.get('token');
        const user = Cookies.get('user');
        
        if (user) {
            const parsedUser = JSON.parse(user);
            initialState.user = {
                ...parsedUser,
                profilePicture: parsedUser.profilePicture || null,
            };
            initialState.isAuthenticated = true;
            initialState.isAdmin = parsedUser.role === 'admin';
        }

        if (token && !isTokenExpired(token)) {
            initialState.token = token;
        } else {
            clearAuthCookies(); // Clear expired token
        }
    } catch (error) {
        console.error("Error loading from cookies:", error);
    }
};

loadFromCookies()


// Async thunk for setting credentials
export const setCredentials = createAsyncThunk(
    'auth/setCredentials',
    async (credentials, { rejectWithValue }) => {
        try {
            const { token, user } = credentials;

            // Set token in cookie
            if (token) {
                setAuthCookie('token', token);
            }

            // Set user in cookie
            if (user) {
                setAuthCookie('user', JSON.stringify(user));
            }

            return credentials;
        } catch (error) {
            console.error('Error setting credentials:', error);
            return rejectWithValue('Failed to set credentials');
        }
    }
);

// Async thunk for refreshing access tokens
export const refreshAccessToken = createAsyncThunk(
    'auth/refreshAccessToken',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const response = await authService.refreshToken({});
            const { accessToken } = response.data;

            setAuthCookie('token', accessToken);
            dispatch(setCredentials({ token: accessToken }));

            return accessToken;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return rejectWithValue('Failed to refresh token');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null,
            state.token = null,
            state.isAuthenticated = false,
            state.isAdmin = false;

            clearAuthCookies()

            // Clean up local/session storage
            localStorage.removeItem('user');
            sessionStorage.clear();
        },
        updateUser: (state, action) => {
            state.user = {
                ...state.user,
                ...action.payload,
            };

            if(state.user) {
                setAuthCookie('user',JSON.stringify(state.user));
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(setCredentials.fulfilled, (state, action) => {
                const { token, user } = action.payload;
                state.token = token;
                state.user = {
                    ...user,
                    profilePicture: user.profilePicture || null,
                };
                state.isAuthenticated = true;
                state.isAdmin = user.role === 'admin';
            })
            .addCase(refreshAccessToken.fulfilled, (state, action) => {
                state.token = action.payload;
            })
            .addCase(refreshAccessToken.rejected, () => {
                console.warn('Failed to refresh access token')
            });
    },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;