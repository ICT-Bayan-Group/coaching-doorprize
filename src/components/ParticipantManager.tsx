import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Trash2, Users, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Participant } from '../types';
import { importFromFile } from '../utils/fileHandling';

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
  onClearAll: () => void;
  onImportParticipants: (participants: Array<{ name: string; email?: string }>) => void;
}

interface ImportResult {
  success: number;
  duplicates: number;
  invalid: number;
  duplicateNames: string[];
  invalidNames: string[];
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onClearAll,
  onImportParticipants,
}) => {
  const [newName, setNewName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatesList, setDuplicatesList] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced name validation
  const validateName = useCallback((name: string): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return { isValid: false, error: 'Nama tidak boleh kosong' };
    }
    
    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Nama minimal 2 karakter' };
    }
    
    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Nama maksimal 100 karakter' };
    }
    
    // Check for existing participant (case insensitive)
    const isDuplicate = participants.some(p => 
      p.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      return { isValid: false, error: `Peserta "${trimmedName}" sudah terdaftar` };
    }
    
    return { isValid: true };
  }, [participants]);

  // Enhanced add participant with validation
  const handleAddName = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    const validation = validateName(newName);
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Input tidak valid');
      return;
    }
    
    onAddParticipant(newName.trim());
    setNewName('');
  }, [newName, validateName, onAddParticipant]);

  // Enhanced import with duplicate detection and reporting
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setValidationError(null);
    setImportResult(null);
    
    try {
      // Import now returns array of { name, phone?, email? }
      const importedData = await importFromFile(file);
      
      // Process and validate
      const processedData = importedData
        .filter(data => data.name && data.name.trim().length > 0)
        .map(data => ({
          name: data.name.trim(),
          phone: data.phone,
          email: data.email
        }));
      
      // Remove duplicates within the import file itself
      const seen = new Map<string, typeof processedData[0]>();
      processedData.forEach(data => {
        const lowerName = data.name.toLowerCase();
        if (!seen.has(lowerName)) {
          seen.set(lowerName, data);
        }
      });
      const uniqueImportData = Array.from(seen.values());
      
      // Check against existing participants
      const existingNames = participants.map(p => p.name.toLowerCase().trim());
      const validData: typeof processedData = [];
      const duplicateNames: string[] = [];
      const invalidNames: string[] = [];
      
      uniqueImportData.forEach(data => {
        const validation = validateName(data.name);
        
        if (!validation.isValid) {
          if (validation.error?.includes('sudah terdaftar')) {
            duplicateNames.push(data.name);
          } else {
            invalidNames.push(data.name);
          }
        } else {
          validData.push(data);
        }
      });
      
      const result: ImportResult = {
        success: validData.length,
        duplicates: duplicateNames.length,
        invalid: invalidNames.length,
        duplicateNames,
        invalidNames
      };
      
      setImportResult(result);
      
      if (validData.length > 0) {
        onImportParticipants(validData);
      }
      
      if (duplicateNames.length > 0) {
        setDuplicatesList(duplicateNames);
        setShowDuplicateModal(true);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      setValidationError(`Error importing file: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateName, participants, onImportParticipants]);

  // Enhanced clear with confirmation and duplicate info
  const handleClearAll = useCallback(() => {
    const duplicateCount = findDuplicates().length;
    const message = duplicateCount > 0 
      ? `Hapus semua ${participants.length} peserta? (Termasuk ${duplicateCount} duplikasi yang terdeteksi)`
      : `Hapus semua ${participants.length} peserta?`;
    
    if (window.confirm(message)) {
      onClearAll();
      setValidationError(null);
      setImportResult(null);
    }
  }, [participants.length, onClearAll]);

  // Utility to find duplicates
  const findDuplicates = useCallback((): Participant[] => {
    const seen = new Set<string>();
    return participants.filter(participant => {
      const normalizedName = participant.name.toLowerCase().trim();
      if (seen.has(normalizedName)) {
        return true;
      }
      seen.add(normalizedName);
      return false;
    });
  }, [participants]);

  // Remove duplicates function
  const removeDuplicates = useCallback(() => {
    const duplicates = findDuplicates();
    if (duplicates.length === 0) {
      alert('Tidak ada duplikasi ditemukan');
      return;
    }
    
    if (window.confirm(`Hapus ${duplicates.length} duplikasi? Hanya akan menyisakan 1 dari setiap nama yang sama.`)) {
      duplicates.forEach(duplicate => {
        onRemoveParticipant(duplicate.id);
      });
    }
  }, [findDuplicates, onRemoveParticipant]);

  const duplicateCount = findDuplicates().length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Peserta ({participants.length})
          {duplicateCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
              {duplicateCount} Duplikat
            </span>
          )}
        </h2>
      </div>

      {/* Duplicate Warning */}
      {duplicateCount > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                {duplicateCount} nama duplikat terdeteksi
              </span>
            </div>
            <button
              onClick={removeDuplicates}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Hapus Duplikat
            </button>
          </div>
        </div>
      )}

      {/* Import Result Display */}
      {importResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-blue-800 font-medium">Hasil Import:</p>
              <p className="text-green-700">✓ {importResult.success} berhasil ditambahkan</p>
              {importResult.duplicates > 0 && (
                <p className="text-red-700">⚠ {importResult.duplicates} duplikat dilewati</p>
              )}
              {importResult.invalid > 0 && (
                <p className="text-orange-700">✗ {importResult.invalid} tidak valid</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <form onSubmit={handleAddName} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Tambah Nama Peserta atau BIB"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                validationError 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {validationError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          
          {participants.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        <AnimatePresence>
          {participants.map((participant) => {
            const isDuplicate = participants.filter(p => 
              p.name.toLowerCase().trim() === participant.name.toLowerCase().trim()
            ).length > 1;
            
            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                  isDuplicate 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-800">{participant.name}</span>
                  {isDuplicate && (
                    <span className="px-2 py-1 bg-red-200 text-red-700 text-xs rounded-full font-medium">
                      Duplikat
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveParticipant(participant.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Hapus peserta"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Partisipan belum ditambahkan</p>
            <p className="text-sm">Tambahkan nama atau impor dari file</p>
          </div>
        )}
      </div>

      {/* Duplicate Detection Modal */}
      {showDuplicateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Duplikasi Terdeteksi</h3>
            </div>

            <p className="text-gray-600 mb-4">
              {duplicatesList.length} nama sudah terdaftar dan dilewati:
            </p>

            <div className="max-h-40 overflow-y-auto mb-4 p-3 bg-gray-50 rounded-lg">
              {duplicatesList.map((name, index) => (
                <div key={index} className="text-sm text-gray-700 mb-1">
                  • {name}
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ParticipantManager;