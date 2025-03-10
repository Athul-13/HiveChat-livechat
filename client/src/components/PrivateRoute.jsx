import {useSelector} from 'react-redux';
import {Navigate, useLocation} from 'react-router-dom';
import PropTypes from 'prop-types';

const PrivateRoute = ({children}) => {
    const {isAuthenticated, token} = useSelector((state) => state.auth);
    const location = useLocation();

    if (!isAuthenticated || !token) {
        return <Navigate 
            to="/" 
            replace={true} 
            state={{
                from: location.pathname !== '/' ? location.pathname : '/homePage' 
            }}
        />;
    }

    return children;
};

PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default PrivateRoute;