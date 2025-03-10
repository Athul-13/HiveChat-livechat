import { useEffect, useState } from "react";
import logo from "../assets/logo.png"; 

export default function Loader () {
    const [progress, setProgress] = useState(0);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return oldProgress + 5; // Adjust speed
        });
      }, 200); // Progress speed
  
      return () => clearInterval(interval);
    }, []);
  
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 p-4">
        {/* Logo */}
        <img src={logo} alt="HiveChat Logo" className="max-w-48 h-auto mb-6" />
      
        {/* Progress Bar */}
        <div className="w-56 h-2 bg-indigo-500/50 rounded-full overflow-hidden shadow-lg">
          <div
            className="h-full bg-indigo-300 transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      
        {/* Faded Text Below Progress Bar */}
        <p className="mt-2 text-xs text-white/70 tracking-wide">
          End-to-end encrypted
        </p>
      </div>
      
    );
  };