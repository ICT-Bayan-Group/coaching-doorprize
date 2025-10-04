import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Settings, Monitor,LogOut, AlertCircle } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface HeaderProps {
  logo?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  logo,
  isFullscreen,
  onToggleFullscreen,
  onOpenSettings,
  onLogout
}) => {
  // Firebase status states
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test connection by listening to a test document
    const testDoc = doc(db, 'connection-test', 'status');
    
    const unsubscribe = onSnapshot(
      testDoc,
      () => {
        setIsConnected(true);
        setLastSync(new Date());
        setError(null);
      },
      (err) => {
        setIsConnected(false);
        setError(err.message);
        console.error('Firebase connection error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      onLogout?.();
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-white to-white text-blue-800 p-4 shadow-lg"
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt="Event Logo" className="h-16 w-auto" />
          ) : (
            <Trophy className="w-8 h-8 text-yellow-400" />
          )}
          <div>
            <h1 className="text-2xl font-bold">COACHING CLINIC</h1>
            <p className="text-red-600 font-semibold text-sm">Undian Doorprize</p>
          </div>
        </div>
        
        {!isFullscreen && (
          <div className="flex items-center gap-2">
            {/* Firebase Status Indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isConnected 
                  ? 'bg-transparent text-green-800 border border-transparent' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {isConnected ? (
                <>
               
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Offline</span>
                </>
              )}
              
              {error && (
                <div className="ml-2 text-xs opacity-75 max-w-32 truncate" title={error}>
                  {error}
                </div>
              )}
            </motion.div>
            
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors"
              title="Open Display Page"
            >
              <Monitor className="w-4 h-4" />
            </button>
            
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors border border-red-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-red-600" />
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;