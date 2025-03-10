import { useState } from "react";
import { User, Lock, Mail, Phone, Eye, EyeOff, XCircle, CheckCircle } from "lucide-react";
import logo from "../assets/logo.png"; 
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { Link, useNavigate } from "react-router-dom";
import { signupSchema } from "../utils/validationSchema";
import toast from 'react-hot-toast';
import { authService } from "../utils/api";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    register, 
    handleSubmit, 
    formState: { errors, dirtyFields, isValid }, 
    watch 
  } = useForm({
    resolver: joiResolver(signupSchema),
    mode: "onChange"
  });

  const navigate = useNavigate()

  // Validation indicators
  const ValidationIndicator = ({ field }) => {
    const value = watch(field);
    const isDirty = dirtyFields[field];
    const hasError = !!errors[field];
    
    if (!isDirty) return null;
    
    return (
      <div className="absolute right-12 top-1/2 -translate-y-1/2">
        {hasError ? (
          <XCircle size={16} className="text-red-500" />
        ) : (
          <CheckCircle size={16} className="text-green-500" />
        )}
      </div>
    );
  };

  // Custom validation indicator for password confirmation
  const ConfirmPasswordValidationIndicator = () => {
    const password = watch("password");
    const confirmPassword = watch("confirmPassword");
    
    if (!confirmPassword) return null;
    
    return (
      <div className="absolute right-12 top-1/2 -translate-y-1/2">
        {password !== confirmPassword ? (
          <XCircle size={16} className="text-red-500" />
        ) : (
          <CheckCircle size={16} className="text-green-500" />
        )}
      </div>
    );
  };

  const onSubmit = async (formData) => {

    setIsSubmitting(true);
    try {
      const response = await authService.register(formData);

      if(response.success) {
        toast.success('Signup successful');
        navigate('/')
      } else {
        toast.error(response.message || 'Signup failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 p-4">
      <div className="w-full max-w-5xl flex overflow-hidden rounded-lg shadow-xl">
        {/* Left side with welcome text and abstract shapes */}
        <div className="relative hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 p-12 text-white flex-col items-center justify-center text-center">
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="text-4xl font-bold mb-4">Create Your HiveChat Account</h1>
            <img src={logo} alt="HiveChat Logo" className="max-w-48 h-auto mb-4" />
            <p className="text-lg opacity-90">
              Join our community and start connecting today!
            </p>
          </div>

          {/* Abstract shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-64 bg-gradient-to-tr from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45 translate-y-1/4 -translate-x-1/4"></div>
            <div className="absolute top-1/2 left-1/3 w-64 h-12 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45"></div>
            <div className="absolute top-1/4 right-0 w-40 h-64 bg-gradient-to-tl from-orange-400 to-pink-400 rounded-full blur-sm transform rotate-45 translate-y-1/4 translate-x-1/4"></div>
            <div className="absolute bottom-1/3 right-1/4 w-64 h-12 bg-gradient-to-l from-orange-400 to-pink-400 rounded-full blur-sm transform -rotate-12"></div>
          </div>
        </div>

        {/* Right side with signup form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-center text-2xl font-medium text-indigo-500 mb-8">SIGN UP</h2>

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex space-x-4">
                <div className="relative w-1/2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    placeholder="First Name"
                    id="firstName"
                    {...register("firstName")}
                  />
                  <ValidationIndicator field="firstName" />
                  {errors.firstName && (
                    <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                      {errors.firstName.message}
                    </div>
                  )}
                </div>
                <div className="relative w-1/2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    placeholder="Last Name"
                    id="lastName"
                    {...register('lastName')}
                  />
                  <ValidationIndicator field="lastName" />
                  {errors.lastName && (
                    <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                      {errors.lastName.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Username"
                  id="username"
                  {...register('username')}
                />
                <ValidationIndicator field="username" />
                  {errors.username && (
                    <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                      {errors.username.message}
                    </div>
                  )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Email Address"
                  id="email"
                  {...register('email')}
                />
                <ValidationIndicator field="email" />
                {errors.email && (
                  <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                    {errors.email.message}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={20} />
                </div>
                <input
                  type="tel"
                  className="block w-full pl-10 pr-3 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Phone Number"
                  id="phoneNo"
                  {...register('phoneNo')}
                />
                <ValidationIndicator field="phoneNo" />
                  {errors.phoneNo && (
                    <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                      {errors.phoneNo.message}
                    </div>
                  )}
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
                  {...register("password")}
                />
                <ValidationIndicator field="password" />
                  {errors.password && (
                    <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                      {errors.password.message}
                    </div>
                  )}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="block w-full pl-10 pr-10 py-3 bg-indigo-50 bg-opacity-50 border-0 rounded-md focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Confirm Password"
                  id="confirmPassword"
                  {...register("confirmPassword")}
                />
                <ConfirmPasswordValidationIndicator />
                {watch("password") !== watch("confirmPassword") && watch("confirmPassword") && (
                  <div className="absolute left-0 -bottom-8 bg-red-100 text-red-700 text-xs p-1 rounded shadow-md z-10">
                    Passwords do not match
                  </div>
                )}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  id="termsAccepted"
                  {...register('termsAccepted')}
                />
                <label htmlFor="termsAccepted" className="ml-2 text-sm text-gray-500">
                  I agree to the Terms and Conditions
                </label>
                {errors.termsAccepted && (
                  <p className="text-red-500 text-sm ml-2">{errors.termsAccepted.message}</p>
                )}
              </div>

              <div>
                <button
                  type="submit"            
                  disabled={isSubmitting || !isValid}
                  className={`w-full py-2 ${isValid ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-400'} text-white font-bold rounded transition-colors mt-6`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner-border animate-spin w-4 h-4 border-t-2 border-white rounded-full" />
                      <span className="ml-2">Signing in...</span>
                    </div>
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </div>

              <div className="text-center text-sm text-gray-500 mt-4">
                Already have an account? <Link to="/" className=" hover:text-indigo-500">
                    Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}