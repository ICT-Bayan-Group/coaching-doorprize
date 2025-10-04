import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (success: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const correctPassword = 'Bayanrun.123!';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate authentication delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (password === correctPassword) {
      setSuccess(true);
      setTimeout(() => {
        onLogin(true);
      }, 500);
    } else {
      setError('Password salah. Silakan coba lagi.');
      setPassword('');
    }
    setIsLoading(false);
  };

  // Floating particles animation
  const particles = Array.from({ length: 6 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-2 h-2 bg-blue-900 rounded-full opacity-30"
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.5, 0.8, 1],
      }}
      transition={{
        duration: 8 + i,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
      style={{
        left: `${20 + i * 10}%`,
        top: `${30 + i * 8}%`,
      }}
    />
  ));

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {particles}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -80, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-lg p-2"
            >
              <img 
                src="/logo.png" 
                alt="Bayan Run Logo" 
                className="w-full h-full object-contain"
              />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              BAYAN RUN 2025
            </h1>
            <p className="text-red-500 font-semibold text-sm">
              Admin Doorprize 
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="relative">
              <motion.div
                whileFocus={{ scale: 1.02 }}
                className="relative"
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-4 pr-12 bg-blue/10 border border-blue/20 rounded-2xl text-blue-900 placeholder-blue-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  disabled={isLoading || success}
                  required
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-900 font-semibold hover:text-white transition-colors duration-900"
                  disabled={isLoading || success}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </motion.div>
                </button>
              </motion.div>

              {/* Password strength indicator */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: password.length > 0 ? `${Math.min((password.length / correctPassword.length) * 100, 100)}%` : 0 
                }}
                className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mt-2 transition-all duration-300"
              />
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="flex items-center space-x-2 text-red-300 text-sm bg-red-500/20 px-4 py-3 rounded-xl border border-red-400/30"
                >
                  <XCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
              
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex items-center space-x-2 text-white text-sm bg-green-700 px-4 py-3 rounded-xl border border-green-400/30"
                >
                  <CheckCircle size={16} />
                  <span>Login berhasil! Mengalihkan...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={isLoading || success || !password.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center space-x-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Memverifikasi...</span>
                  </motion.div>
                ) : success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center space-x-2"
                  >
                    <CheckCircle size={20} />
                    <span>Berhasil!</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Masuk
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-blue-900 font-semibold text-sm">
              © 2025 Bayan Run - ICT Bayan Group
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-10 right-10 w-6 h-6 border-2 border-white/20 rounded-full"
      />
      
      <motion.div
        animate={{
          rotate: [360, 0],
          scale: [1, 0.8, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-16 left-16 w-4 h-4 bg-white/10 rounded-full"
      />
    </div>
  );
};

export default LoginPage;