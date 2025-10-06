import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Trophy, Users, Gift, Trash2, AlertTriangle, Clock, Target, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Participant, Winner, AppSettings, Prize } from '../types';

interface MultiDrawingAreaProps {
  participants: Participant[];
  currentWinners: Winner[];
  isDrawing: boolean;
  settings: AppSettings;
  selectedPrize: Prize | null;
  onStartDraw: () => void;
  onStopDraw: (finalWinners: Winner[]) => void;
  onClearWinners: () => void;
  canDraw: boolean;
  prizes: Prize[];
  selectedPrizeId: string | null;
  onRemoveParticipants: (participantIds: string[]) => void;
  updateDrawingState: (state: any) => void;
}

type RemovalStatus = 'idle' | 'processing' | 'success' | 'error';

interface WinnerProcessingState {
  status: RemovalStatus;
  processedCount: number;
  totalCount: number;
  error?: string;
}

const MultiDrawingArea: React.FC<MultiDrawingAreaProps> = ({
  participants,
  currentWinners,
  isDrawing,
  settings,
  selectedPrize: legacySelectedPrize,
  onStartDraw,
  onStopDraw,
  onClearWinners,
  canDraw,
  prizes,
  selectedPrizeId,
  onRemoveParticipants,
  updateDrawingState,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drawingDuration, setDrawingDuration] = useState(0);
  
  // Pre-determined winners state
  const [predeterminedWinners, setPredeterminedWinners] = useState<Winner[]>([]);
  const [vipControlActive, setVipControlActive] = useState(false);
  const [vipControlStatus, setVipControlStatus] = useState<'idle' | 'active' | 'processing' | 'completed'>('idle');
  
  // Enhanced winner processing state
  const [winnerProcessing, setWinnerProcessing] = useState<WinnerProcessingState>({
    status: 'idle',
    processedCount: 0,
    totalCount: 0
  });

  // Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Calculate available participants (excluding current winners)
  const availableParticipants = useMemo(() => {
    const winnerNames = currentWinners.map(winner => winner.name);
    return participants.filter(participant => !winnerNames.includes(participant.name));
  }, [participants, currentWinners]);

  // Calculate draw count
  const drawCount = selectedPrize
    ? Math.min(selectedPrize.remainingQuota, availableParticipants.length)
    : Math.min(settings.multiDrawCount, availableParticipants.length);

  // ENHANCED: Monitor VIP control activity from Firebase state and localStorage
  useEffect(() => {
    const checkVipControl = () => {
      // Check multiple sources for VIP control status
      const firebaseVipActive = updateDrawingState && typeof updateDrawingState === 'function';
      const localStorageVipProcessed = localStorage.getItem('vipProcessedWinners') === 'true';
      const vipSession = localStorage.getItem('vipDrawSession');
      
      // Determine VIP control status
      if (localStorageVipProcessed || vipSession) {
        setVipControlActive(true);
        setVipControlStatus('completed');
      } else if (firebaseVipActive) {
        // Check if there's an active VIP draw session
        const vipActive = currentWinners.length > 0 && isDrawing;
        if (vipActive) {
          setVipControlActive(true);
          setVipControlStatus('active');
        }
      } else {
        setVipControlActive(false);
        setVipControlStatus('idle');
      }
    };
    
    checkVipControl();
    
    // Set up periodic check for VIP status changes
    const interval = setInterval(checkVipControl, 1000);
    return () => clearInterval(interval);
  }, [updateDrawingState, currentWinners, isDrawing]);

  // Timer for drawing duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDrawing) {
      interval = setInterval(() => {
        setDrawingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDrawingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isDrawing]);

  // Enhanced winner processing with better state management
  const processWinnerRemoval = useCallback(async (winners: Winner[]) => {
    if (winners.length === 0) return;

    const winnerParticipantIds = winners.map(winner => {
      const participant = availableParticipants.find(p => p.name === winner.name);
      return participant?.id;
    }).filter(Boolean) as string[];

    if (winnerParticipantIds.length === 0) return;

    setWinnerProcessing({
      status: 'processing',
      processedCount: 0,
      totalCount: winnerParticipantIds.length
    });

    try {
      // Simulate processing steps for better UX
      for (let i = 0; i < winnerParticipantIds.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setWinnerProcessing(prev => ({
          ...prev,
          processedCount: i + 1
        }));
      }

      // Perform the actual removal
      onRemoveParticipants(winnerParticipantIds);

      setWinnerProcessing({
        status: 'success',
        processedCount: winnerParticipantIds.length,
        totalCount: winnerParticipantIds.length
      });

      // Reset status after showing success
      setTimeout(() => {
        setWinnerProcessing({
          status: 'idle',
          processedCount: 0,
          totalCount: 0
        });
      }, 2000);

    } catch (error) {
      setWinnerProcessing({
        status: 'error',
        processedCount: 0,
        totalCount: winnerParticipantIds.length,
        error: 'Gagal menghapus pemenang dari daftar peserta'
      });

      // Reset error status after showing it
      setTimeout(() => {
        setWinnerProcessing({
          status: 'idle',
          processedCount: 0,
          totalCount: 0
        });
      }, 3000);
    }
  }, [availableParticipants, onRemoveParticipants]);

  // Enhanced draw validation
  const validateDraw = useCallback((): { isValid: boolean; message?: string } => {
    if (vipControlActive && vipControlStatus === 'active') {
      return { isValid: false, message: 'VIP sedang mengontrol undian. Silakan tunggu.' };
    }
    if (!selectedPrize) {
      return { isValid: false, message: 'Silakan pilih hadiah sebelum memulai undian.' };
    }
    if (selectedPrize.remainingQuota === 0) {
      return { isValid: false, message: 'Hadiah ini tidak memiliki kuota tersisa.' };
    }
    if (availableParticipants.length === 0) {
      return { isValid: false, message: 'Tidak ada peserta yang tersedia untuk undian (semua sudah menang).' };
    }
    if (drawCount === 0) {
      return { isValid: false, message: 'Tidak ada pemenang yang dapat diundi dengan pengaturan saat ini.' };
    }
    return { isValid: true };
  }, [selectedPrize, availableParticipants, drawCount, vipControlActive, vipControlStatus]);

  // Generate winners at draw start
  const generateWinners = useCallback((): Winner[] => {
    if (!selectedPrize || availableParticipants.length === 0) return [];

    const shuffledParticipants = [...availableParticipants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffledParticipants.slice(0, drawCount);

    return selectedParticipants.map((participant, index) => ({
      id: `${participant.id}-${Date.now()}-${index}`,
      name: participant.name,
     // phone: participant.phone, // TAMBAHKAN ini
       email: participant.email,  // TAMBAHKAN ini
      wonAt: new Date(),
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      drawSession: `admin-${selectedPrize.id}-${Date.now()}`
    }));
  }, [selectedPrize, availableParticipants, drawCount]);

  // ENHANCED: handleDrawClick - Check for VIP control first
  const handleDrawClick = useCallback(() => {
    // Check if VIP is currently controlling
    if (vipControlActive && vipControlStatus !== 'completed') {
      alert('VIP sedang mengontrol undian. Silakan tunggu VIP selesai atau gunakan panel VIP.');
      return;
    }

    const validation = validateDraw();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }
    
    console.log('Admin: Memulai undian dengan hadiah:', selectedPrize);
    
    // Generate winners immediately and store them
    const finalWinners = generateWinners();
    setPredeterminedWinners(finalWinners);
    
    console.log('Admin: Pemenang yang telah ditentukan:', finalWinners);
    
    // Update Firebase state with pre-determined winners
    updateDrawingState({
      isDrawing: true,
      currentWinners: [],
      shouldStartSpinning: false,
      showWinnerDisplay: false,
      selectedPrizeName: selectedPrize?.name,
      selectedPrizeImage: selectedPrize?.image,
      selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
      selectedPrizeId: selectedPrize?.id,
      participants: participants,
      drawStartTime: Date.now(),
      finalWinners: finalWinners,
      predeterminedWinners: finalWinners,
      vipProcessedWinners: false, // Reset VIP flag
      vipControlActive: false // Admin is taking control
    });
    
    // Clear VIP flag from localStorage when admin takes control
    localStorage.removeItem('vipProcessedWinners');
    localStorage.removeItem('vipDrawSession');
    setVipControlActive(false);
    setVipControlStatus('idle');
    
    onStartDraw();
  }, [validateDraw, generateWinners, onStartDraw, updateDrawingState, selectedPrize, participants, vipControlActive, vipControlStatus]);

  // Start spinning animation
  const handleStartSpinning = useCallback(() => {
    if (vipControlActive && vipControlStatus === 'active') {
      alert('VIP mengontrol undian. Gunakan panel VIP untuk mengontrol spinning.');
      return;
    }

    console.log('Admin: Memulai animasi spinning dengan pemenang yang telah ditentukan:', predeterminedWinners);
    
    updateDrawingState({
      shouldStartSpinning: true,
      isDrawing: true,
      predeterminedWinners: predeterminedWinners
    });
  }, [updateDrawingState, predeterminedWinners, vipControlActive, vipControlStatus]);

  // ENHANCED: handleStopDrawClick - Handles both admin and VIP processed results
  const handleStopDrawClick = useCallback(async () => {
    // Check if VIP has already processed winners
    const vipProcessed = localStorage.getItem('vipProcessedWinners') === 'true';
    const vipSession = localStorage.getItem('vipDrawSession');
    
    if (vipProcessed || (vipControlActive && vipControlStatus === 'completed')) {
      console.log('Admin: VIP telah memproses pemenang, hanya mengupdate UI');
      
       // PERBAIKAN: Pastikan currentWinners memiliki data lengkap dengan phone/email
    const enrichedWinners = currentWinners.map(winner => {
      const participant = participants.find(p => p.name === winner.name);
      return {
        ...winner,
       // phone: participant?.phone || winner.phone,
        email: participant?.email || winner.email
      };
    });
      // VIP has processed - just update UI state without database operations
      updateDrawingState({
        isDrawing: false,
        shouldStartSpinning: false,
        shouldStartSlowdown: false,
        showWinnerDisplay: true,
        finalWinners: currentWinners,
         currentWinners: enrichedWinners,
      });
      onStopDraw(enrichedWinners);
      
      // Process winner removal after draw completion
    setTimeout(() => {
      processWinnerRemoval(enrichedWinners);
    }, 1000);
    
    setPredeterminedWinners([]);
    return;
  }

  // Standard admin processing - PASTIKAN predeterminedWinners sudah memiliki phone/email
    console.log('Admin: Memulai perlambatan natural ke pemenang yang telah ditentukan:', predeterminedWinners);
    
    if (predeterminedWinners.length === 0) {
      console.error('Admin: Tidak ada pemenang yang telah ditentukan!');
      return;
    }

     // PERBAIKAN: Enrich predetermined winners dengan phone/email data
    const enrichedPredeterminedWinners = predeterminedWinners.map(winner => {
    const participant = participants.find(p => p.name === winner.name);
    return {
      ...winner,
      //phone: participant?.phone || winner.phone,
      email: participant?.email || winner.email
    };
  });
    
    // Start natural slowdown process
    updateDrawingState({
      shouldStartSlowdown: true,
      shouldStartSpinning: true,
      predeterminedWinners: enrichedPredeterminedWinners
    });
    
    // After 3.5 seconds, finalize results
    setTimeout(() => {
      console.log('Admin: Menyelesaikan hasil setelah perlambatan natural');
      
      updateDrawingState({
        isDrawing: false,
        shouldStartSpinning: false,
        shouldStartSlowdown: false,
        showWinnerDisplay: true,
        finalWinners: enrichedPredeterminedWinners,
        currentWinners: enrichedPredeterminedWinners,
      });
      
      // Call onStopDraw dengan enriched pre-determined winners
    onStopDraw(enrichedPredeterminedWinners);
    
    // Process winner removal after draw completion
    setTimeout(() => {
      processWinnerRemoval(enrichedPredeterminedWinners);
    }, 1000);
    
    setPredeterminedWinners([]);
    
  }, 3500);
  
}, [predeterminedWinners, updateDrawingState, onStopDraw, processWinnerRemoval, currentWinners, vipControlActive, vipControlStatus, participants]);

  // Enhanced handleDeleteClick
  const handleDeleteClick = () => setShowDeleteConfirm(true);
  
  const handleConfirmDelete = () => {
    console.log('Admin: Membersihkan pemenang');
    
    // Clear pre-determined winners
    setPredeterminedWinners([]);
    
    // Clear VIP processing flag
    localStorage.removeItem('vipProcessedWinners');
    localStorage.removeItem('vipDrawSession');
    setVipControlActive(false);
    setVipControlStatus('idle');
    
    // Update Firebase state
    updateDrawingState({
      showWinnerDisplay: false,
      currentWinners: [],
      finalWinners: [],
      predeterminedWinners: [],
      vipProcessedWinners: false,
      vipControlActive: false
    });
    
    onClearWinners();
    setShowDeleteConfirm(false);
  };
  
  const handleCancelDelete = () => setShowDeleteConfirm(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          Undian Doorprize
          {vipControlActive && (
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
              vipControlStatus === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : vipControlStatus === 'active' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-purple-100 text-purple-700'
            }`}>
              <Shield className="w-3 h-3" />
              {vipControlStatus === 'completed' ? 'VIP Selesai' : 
               vipControlStatus === 'active' ? 'VIP Aktif' : 'Kontrol VIP'}
            </div>
          )}
        </h2>
        
        {isDrawing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-medium text-sm">
              Undian: {formatTime(drawingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* ENHANCED: VIP Control Status with detailed information */}
      {vipControlActive && (
        <div className={`mb-6 p-4 rounded-lg border ${
          vipControlStatus === 'completed' 
            ? 'bg-green-50 border-green-200' 
            : vipControlStatus === 'active' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${
              vipControlStatus === 'completed' ? 'text-green-600' : 
              vipControlStatus === 'active' ? 'text-yellow-600' : 'text-purple-600'
            }`} />
            <div>
              <p className={`font-medium ${
                vipControlStatus === 'completed' ? 'text-green-800' : 
                vipControlStatus === 'active' ? 'text-yellow-800' : 'text-purple-800'
              }`}>
                {vipControlStatus === 'completed' ? 'Kontrol VIP Selesai' : 
                 vipControlStatus === 'active' ? 'Kontrol VIP Aktif' : 'Mode Kontrol VIP'}
              </p>
              <p className={`text-sm ${
                vipControlStatus === 'completed' ? 'text-green-600' : 
                vipControlStatus === 'active' ? 'text-yellow-600' : 'text-purple-600'
              }`}>
                {vipControlStatus === 'completed' 
                  ? 'Pemenang telah diproses oleh panel VIP. Anda dapat membersihkan tampilan atau mengelola hasil.'
                  : vipControlStatus === 'active' 
                    ? 'Undian saat ini dikontrol oleh panel VIP. Silakan tunggu atau gunakan panel VIP.'
                    : 'Undian dapat dikontrol oleh panel VIP. Pemenang akan diproses secara otomatis.'
                }
              </p>
              {localStorage.getItem('vipDrawSession') && (
                <p className="text-xs mt-1 opacity-75">
                  Sesi: {localStorage.getItem('vipDrawSession')?.slice(-8)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prize Selection Status */}
      {selectedPrize ? (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center gap-4">
            {selectedPrize.image ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={selectedPrize.image} 
                  alt={selectedPrize.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gift className="w-8 h-8 text-purple-600" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                  Hadiah Terpilih
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Update Langsung
                </span>
              </div>
              <h3 className="font-semibold text-purple-800 text-lg">{selectedPrize.name}</h3>
              <p className="text-purple-600 text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Undi {drawCount} pemenang 
                ({selectedPrize.remainingQuota} tersisa)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Hadiah Tidak Terpilih</p>
              <p className="text-orange-600 text-sm">Silakan pilih hadiah dari daftar hadiah untuk memulai pengundian</p>
            </div>
          </div>
        </div>
      )}

      {/* Draw Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-medium text-sm">Peserta</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{availableParticipants.length}</p>
          <p className="text-xs text-blue-600">
            {participants.length - availableParticipants.length} sudah menang
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium text-sm">Kuota</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{drawCount}</p>
        </div>
      </div>

      {predeterminedWinners.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Pemenang Sudah Ditentukan</p>
              <p className="text-yellow-600 text-sm">
                {predeterminedWinners.length} pemenang siap untuk diumumkan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {availableParticipants.length === 0 && participants.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Tidak ada Peserta Tersisa</p>
              <p className="text-red-600 text-sm">
                Semua peserta sudah menjadi pemenang
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Winner Processing Status */}
      {winnerProcessing.status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg border ${
            winnerProcessing.status === 'processing' ? 'bg-blue-50 border-blue-200' :
            winnerProcessing.status === 'success' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {winnerProcessing.status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
              />
            )}
            {winnerProcessing.status === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {winnerProcessing.status === 'error' && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            
            <div className="flex-1">
              <p className={`font-medium ${
                winnerProcessing.status === 'processing' ? 'text-blue-800' :
                winnerProcessing.status === 'success' ? 'text-green-800' :
                'text-red-800'
              }`}>
                {winnerProcessing.status === 'processing' && 
                  `Memproses Pemenang (${winnerProcessing.processedCount}/${winnerProcessing.totalCount})`
                }
                {winnerProcessing.status === 'success' && 
                  `Berhasil memproses ${winnerProcessing.totalCount} pemenang`
                }
                {winnerProcessing.status === 'error' && 'Pemrosesan Gagal'}
              </p>
              
              {winnerProcessing.status === 'processing' && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <motion.div 
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(winnerProcessing.processedCount / winnerProcessing.totalCount) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              
              {winnerProcessing.status === 'success' && (
                <p className="text-green-600 text-sm">
                  Pemenang dihapus dari daftar peserta secara otomatis
                </p>
              )}
              
              {winnerProcessing.status === 'error' && (
                <p className="text-red-600 text-sm">
                  {winnerProcessing.error || 'Terjadi kesalahan saat memproses pemenang'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Drawing Controls */}
      <div className="mb-6">
        <div className="flex space-x-3">
          {!isDrawing ? (
            <button
              onClick={handleDrawClick}
              disabled={!canDraw || !selectedPrize || availableParticipants.length === 0 || (vipControlActive && vipControlStatus === 'active')}
              className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex-1 justify-center ${
                canDraw && selectedPrize && availableParticipants.length > 0 && !(vipControlActive && vipControlStatus === 'active')
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              {vipControlActive && vipControlStatus === 'active'
                ? 'VIP Mengontrol'
                : !selectedPrize 
                  ? 'Pilih Hadiah' 
                  : availableParticipants.length === 0 
                    ? 'Tidak Ada Peserta' 
                    : `Siapkan Hadiah (${drawCount})`
              }
            </button>
          ) : (
            <div className="flex space-x-3 flex-1">
              <button
                onClick={handleStartSpinning}
                disabled={predeterminedWinners.length === 0 || (vipControlActive && vipControlStatus === 'active')}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 mr-2" />
                {vipControlActive && vipControlStatus === 'active' ? 'VIP Mengontrol' : 'Mulai Spinning!'}
              </button>
              
              <button
                onClick={handleStopDrawClick}
                disabled={predeterminedWinners.length === 0 && !(vipControlActive && vipControlStatus === 'completed')}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Square className="w-5 h-5 mr-2" />
                {vipControlActive && vipControlStatus === 'completed' ? 'Proses Hasil VIP' : 'Stop Undian'}
              </button>
            </div>
          )}

          {currentWinners.length > 0 && !isDrawing && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
              title="Hapus Data Pemenang"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drawing Status */}
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                />
                <span className="text-blue-600 font-medium">
                  {predeterminedWinners.length > 0 
                    ? 'Pemenang siap! Klik "Mulai Spinning" → "Stop Undian" untuk efek realistis!'
                    : 'Menentukan pemenang... Silakan tunggu!'
                  }
                </span>
              </div>
              {vipControlActive && (
                <span className={`text-xs font-medium ${
                  vipControlStatus === 'completed' ? 'text-green-600' : 
                  vipControlStatus === 'active' ? 'text-yellow-600' : 'text-purple-600'
                }`}>
                  {vipControlStatus === 'completed' ? 'VIP Selesai' : 
                   vipControlStatus === 'active' ? 'VIP Aktif' : 'Mode Kontrol VIP'}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Hapus Data Undian</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus semua pemenang saat ini? Ini akan menghapus {currentWinners.length} pemenang dari tampilan.
              <strong className="text-red-600"> Catatan: Ini TIDAK akan mengembalikan pemenang ke daftar peserta.</strong>
              {vipControlActive && (
                <span className="block mt-2 text-purple-600 font-medium">
                  Ini juga akan membersihkan status kontrol VIP.
                </span>
              )}
            </p>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Hapus
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Current Winners Display */}
      {currentWinners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Pemenang Terakhir ({currentWinners.length})
              {vipControlActive && (
                <span className={`text-xs font-medium ${
                  vipControlStatus === 'completed' ? 'text-green-600' : 'text-purple-600'
                }`}>
                  {vipControlStatus === 'completed' ? '(Diproses VIP)' : '(Kontrol VIP)'}
                </span>
              )}
            </h3>
            {selectedPrize && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                {selectedPrize.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {currentWinners.map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{winner.name}</p>
                      <p className="text-xs text-gray-500">
                        {vipControlActive && vipControlStatus === 'completed' ? 'Diproses VIP' : 'Diproses Admin'}
                      </p>
                    </div>
                  </div>
                  {selectedPrize?.image && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm">
                      <img 
                        src={selectedPrize.image} 
                        alt={selectedPrize.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiDrawingArea;