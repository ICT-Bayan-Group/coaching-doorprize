import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpdateSettings({ eventLogo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Logo Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Event Logo
                </h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {settings.eventLogo && (
                  <div className="mt-4">
                    <img
                      src={settings.eventLogo}
                      alt="Event Logo"
                      className="h-16 w-auto border rounded"
                    />
                  </div>
                )}
              </div>


              {/* Animation Style */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Animation Style</h3>
                <div className="space-y-3">
                  {['wheel', 'scroll', 'cards'].map((type) => (
                    <label key={type} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="animationType"
                        value={type}
                        checked={settings.animationType === type}
                        onChange={(e) => onUpdateSettings({ animationType: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="capitalize text-gray-700">{type} Animation</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Multi-Draw Count */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Draw Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Draw Count (when no prize selected)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.multiDrawCount || 10}
                    onChange={(e) => onUpdateSettings({ multiDrawCount: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of winners to draw when no specific prize is selected
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;