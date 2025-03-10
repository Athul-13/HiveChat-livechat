import { useState } from "react";
import { User, Lock, Check, EyeOff, Eye } from "lucide-react";
import logo from "../assets/logo.png"; 
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import {setCredentials} from '../redux/authSlice'
import { authService } from "../utils/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
      return <Navigate to="/homePage" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await authService.login({email, password});

      if(data.status === 'inactive') {
        toast.error('User has been restricted from loggin in');
        return;
      }

      dispatch(setCredentials({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          id: data._id,
          firstName: data.firstName,
          lastName: data.lastName,
          profilePicture: data.profilePicture,
          about: data.about,
          username: data.username,
          phoneNo: data.phoneNo,
          email: data.email,
          status: data.status,
          role: data.role
        }
      }));
      const from = data.role === 'admin' ? '/admin' : '/homePage';
      navigate(from, {replace: true})
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 p-4">
      <div className="w-full max-w-5xl flex overflow-hidden rounded-lg shadow-xl">
        {/* Left side with welcome text and abstract shapes */}
        <div className="relative hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 p-12 text-white flex-col items-center justify-center text-center">
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to HiveChat</h1>
            <img src={logo} alt="HiveChat Logo" className="max-w-48 h-auto mb-4" /> {/* Logo */}
          </div>

          {/* Abstract shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-64 bg-gradient-to-tr from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45 translate-y-1/4 -translate-x-1/4"></div>
            <div className="absolute top-1/2 left-1/3 w-64 h-12 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45"></div>
            <div className="absolute top-1/4 right-0 w-40 h-64 bg-gradient-to-tl from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45 translate-y-1/4 translate-x-1/4"></div>
            <div className="absolute bottom-1/3 right-1/4 w-64 h-12 bg-gradient-to-l from-orange-400 to-pink-400 rounded-full blur-sm transform -rotate-12"></div>
          </div>
          
        </div>

        {/* Right side with login form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-center text-2xl font-medium text-indigo-500 mb-8">LOGIN</h2>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Email"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="block w-full pl-10 pr-10 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Password"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    type="button"
                    className={`w-5 h-5 rounded flex items-center justify-center ${
                      rememberMe ? "bg-indigo-500" : "border border-gray-300"
                    }`}
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && <Check size={14} className="text-white" />}
                  </button>
                  <label htmlFor="remember-me" className="ml-2 text-sm text-gray-500">
                    Remember
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="text-gray-500 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-400 to-purple-500 hover:from-indigo-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  LOGIN
                </button>
              </div>

              <div className="text-sm">
                <Link to="/signup" className="text-gray-500 hover:text-indigo-500">
                    Don&apos;t have an account?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
