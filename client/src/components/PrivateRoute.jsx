import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { refreshAccessToken } from '../redux/authSlice';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();

  // Function to check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  };

  // Try to refresh token if it's expired but we still have a user
  useEffect(() => {
    const handleTokenRefresh = async () => {
      if (user && token && isTokenExpired(token)) {
        try {
          await dispatch(refreshAccessToken()).unwrap();
        } catch (error) {
          console.error("Failed to refresh token:", error);
          // No need to do anything else here, the rendering logic below will handle it
        }
      }
    };

    handleTokenRefresh();
  }, [dispatch, token, user]);

  // After trying to refresh, make the final decision
  if (!isAuthenticated || !token || (token && isTokenExpired(token))) {
    return (
      <Navigate
        to="/"
        replace={true}
        state={{
          from: location.pathname !== '/' ? location.pathname : '/homePage'
        }}
      />
    );
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;