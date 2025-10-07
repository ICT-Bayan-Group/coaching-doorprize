import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Square, Zap, Shield, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { useFirebaseDrawingState } from '../hooks/useFirebaseDrawingState';
import { Participant, Winner, Prize, AppSettings } from '../types';

const VipPage: React.FC = () => {
  // Firebase hooks
  const participantsHook = useFirestore<Participant>('participants', 'addedAt');
  const prizesHook = useFirestore<Prize>('prizes', 'createdAt');
  const winnersHook = useFirestore<Winner>('winners', 'wonAt');
  const settingsHook = useFirestore<AppSettings & { id: string }>('settings');
  const { drawingState, updateDrawingState } = useFirebaseDrawingState();

  // Extract data
  const participants = participantsHook.data;
  const prizes = prizesHook.data;
  const settings = settingsHook.data[0] || {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    animationType: 'wheel',
    soundEnabled: true,
    backgroundMusic: false,
    multiDrawCount: 10
  };

  // Local state
  const [isDrawing, setIsDrawing] = useState(drawingState.isDrawing || false);
  const [predeterminedWinners, setPredeterminedWinners] = useState<Winner[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(drawingState.selectedPrizeId || null);
  const [drawingPhase, setDrawingPhase] = useState<'spinning' | 'generated'>('generated');
  const [drawingDuration, setDrawingDuration] = useState(0);
  
  // VIP control state management
  const [vipControlActive, setVipControlActive] = useState(false);
  const [vipControlStatus, setVipControlStatus] = useState<'idle' | 'active' | 'processing' | 'completed'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'generating' | 'spinning' | 'stopping' | 'saving' | 'complete' | 'error'>('idle');
  const [lastDrawSession, setLastDrawSession] = useState<string | null>(null);

  // Enhanced: Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Enhanced: Calculate available participants (excluding current winners)
  const availableParticipants = useMemo(() => {
    const currentWinners = drawingState.currentWinners || [];
    const winnerNames = currentWinners.map(winner => winner.name);
    return participants.filter(participant => !winnerNames.includes(participant.name));
  }, [participants, drawingState.currentWinners]);

  // Enhanced: Calculate draw count
  const drawCount = selectedPrize
    ? Math.min(selectedPrize.remainingQuota, availableParticipants.length)
    : Math.min(settings.multiDrawCount, availableParticipants.length);

  // Enhanced: Monitor VIP control activity from Firebase state and localStorage
  useEffect(() => {
    const checkVipControl = () => {
      const firebaseVipActive = updateDrawingState && typeof updateDrawingState === 'function';
      const localStorageVipProcessed = localStorage.getItem('vipProcessedWinners') === 'true';
      const vipSession = localStorage.getItem('vipDrawSession');
      
      if (localStorageVipProcessed || vipSession) {
        setVipControlActive(true);
        setVipControlStatus('completed');
      } else if (firebaseVipActive) {
        const vipActive = (drawingState.currentWinners?.length || 0) > 0 && isDrawing;
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
    const interval = setInterval(checkVipControl, 1000);
    return () => clearInterval(interval);
  }, [updateDrawingState, drawingState.currentWinners, isDrawing]);

  // Enhanced: Timer for drawing duration
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

  // Sync with Firebase state
  useEffect(() => {
    setIsDrawing(drawingState.isDrawing || false);
    if (drawingState.predeterminedWinners) {
      setPredeterminedWinners(drawingState.predeterminedWinners);
    }
    if (drawingState.selectedPrizeId) {
      setSelectedPrizeId(drawingState.selectedPrizeId);
    }
    
    // Simplified phase management - only 'generated' or 'spinning'
    if (!drawingState.isDrawing) {
      setDrawingPhase('generated');
      setVipControlActive(false);
      setIsProcessing(false);
      setProcessingStatus('idle');
    } else if (drawingState.shouldStartSpinning) {
      setDrawingPhase('spinning');
    } else {
      setDrawingPhase('generated');
    }
    
    const vipProcessed = drawingState.vipProcessedWinners || false;
    setVipControlActive(vipProcessed || drawingState.vipControlActive || false);
  }, [drawingState]);

  // Auto-select first available prize
  useEffect(() => {
    if (!selectedPrizeId && prizes.length > 0) {
      const availablePrize = prizes.find(prize => prize.remainingQuota > 0);
      if (availablePrize) {
        setSelectedPrizeId(availablePrize.id);
        updateDrawingState({
          selectedPrizeId: availablePrize.id
        });
      }
    }
  }, [prizes, selectedPrizeId]);

  // Enhanced: Draw validation
  const validateDraw = useCallback((): { isValid: boolean; message?: string } => {
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
  }, [selectedPrize, availableParticipants, drawCount]);

  // Enhanced: Generate winners function
  const generateWinners = useCallback((): Winner[] => {
    if (!selectedPrize || availableParticipants.length === 0) return [];

    const shuffledParticipants = [...availableParticipants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffledParticipants.slice(0, drawCount);

    const sessionId = `vip-${selectedPrize.id}-${Date.now()}`;
    setLastDrawSession(sessionId);
    
    return selectedParticipants.map((participant, index) => ({
      id: `${participant.id}-${Date.now()}-${index}`,
      name: participant.name,
      wonAt: new Date(),
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      drawSession: sessionId
    }));
  }, [selectedPrize, availableParticipants, drawCount]);

  // Enhanced: Database operations with conflict prevention
  const saveWinnersToDatabase = useCallback(async (winners: Winner[]) => {
    if (winners.length === 0) return false;
    
    try {
      setProcessingStatus('saving');
      console.log('VIP: Menyimpan pemenang ke database:', winners);
      
      const existingWinners = winnersHook.data.filter(w => 
        w.drawSession === lastDrawSession
      );
      
      if (existingWinners.length > 0) {
        console.log('VIP: Pemenang sudah ada untuk sesi ini, melewati penyimpanan');
        return true;
      }
      
      for (const winner of winners) {
        await winnersHook.add(winner);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('VIP: Berhasil menyimpan semua pemenang');
      return true;
    } catch (error) {
      console.error('VIP: Error menyimpan pemenang:', error);
      setProcessingStatus('error');
      return false;
    }
  }, [winnersHook, lastDrawSession]);
  
  // Enhanced: Prize quota update
  const updatePrizeQuota = useCallback(async (prize: Prize, winnersCount: number) => {
    try {
      const currentPrize = prizes.find(p => p.id === prize.id);
      if (!currentPrize) return false;
      
      const newQuota = Math.max(0, currentPrize.remainingQuota - winnersCount);
      
      await prizesHook.update(prize.id, {
        remainingQuota: newQuota
      });
      
      console.log('VIP: Kuota hadiah diperbarui:', { prizeId: prize.id, newQuota });
      
      if (newQuota <= 0) {
        setSelectedPrizeId(null);
        await updateDrawingState({
          selectedPrizeId: null
        });
      }
      
      return true;
    } catch (error) {
      console.error('VIP: Error memperbarui kuota hadiah:', error);
      return false;
    }
  }, [prizes, prizesHook, updateDrawingState]);

  // Simplified: Main button handler - only start and stop
  const handleMainButton = useCallback(async () => {
    if (isProcessing) {
      console.log('VIP: Sedang memproses, mengabaikan klik tombol');
      return;
    }
    
    if (drawingPhase === 'generated') {
      // Start Drawing - Generate winners and start spinning
      const validation = validateDraw();
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      setIsProcessing(true);
      setProcessingStatus('generating');
      setVipControlActive(true);
      
      console.log('VIP: Memulai undian dengan hadiah:', selectedPrize);
      
      const finalWinners = generateWinners();
      setPredeterminedWinners(finalWinners);
      
      console.log('VIP: Pemenang yang telah ditentukan:', finalWinners);
      
      await updateDrawingState({
        isDrawing: true,
        currentWinners: [],
        shouldStartSpinning: true,
        showWinnerDisplay: false,
        selectedPrizeName: selectedPrize?.name,
        selectedPrizeImage: selectedPrize?.image,
        selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
        selectedPrizeId: selectedPrize?.id,
        participants: participants,
        drawStartTime: Date.now(),
        finalWinners: finalWinners,
        predeterminedWinners: finalWinners,
        vipProcessedWinners: false,
        vipControlActive: true
      });
      
      localStorage.removeItem('vipProcessedWinners');
      localStorage.removeItem('vipDrawSession');
      
      setIsDrawing(true);
      setDrawingPhase('spinning');
      setProcessingStatus('complete');
      setIsProcessing(false);

    } else if (drawingPhase === 'spinning') {
      // Stop Drawing
      if (predeterminedWinners.length === 0) return;

      setIsProcessing(true);
      setProcessingStatus('stopping');
      
      console.log('VIP: Memulai urutan stop dengan pemenang:', predeterminedWinners);
      
      await updateDrawingState({
        shouldStartSlowdown: true,
        shouldStartSpinning: true,
        predeterminedWinners: predeterminedWinners,
        vipControlActive: true
      });
      
      setTimeout(async () => {
        console.log('VIP: Menyelesaikan hasil setelah perlambatan natural');
        
        const saveSuccess = await saveWinnersToDatabase(predeterminedWinners);
        if (!saveSuccess) {
          setProcessingStatus('error');
          setIsProcessing(false);
          return;
        }
        
        if (selectedPrize) {
          await updatePrizeQuota(selectedPrize, predeterminedWinners.length);
        }
        
        await updateDrawingState({
          isDrawing: false,
          shouldStartSpinning: false,
          shouldStartSlowdown: false,
          showWinnerDisplay: true,
          finalWinners: predeterminedWinners,
          currentWinners: predeterminedWinners,
          vipProcessedWinners: true,
          vipControlActive: true
        });
        
        localStorage.setItem('vipProcessedWinners', 'true');
        localStorage.setItem('vipDrawSession', lastDrawSession || '');
        
        console.log('VIP: Semua pemrosesan selesai, pemenang disimpan dan ditampilkan');
        
        setProcessingStatus('complete');
        setIsDrawing(false);
        setPredeterminedWinners([]);
        setDrawingPhase('generated');
        setIsProcessing(false);
        
      }, 3500);
    }
  }, [drawingPhase, validateDraw, generateWinners, selectedPrize, predeterminedWinners, updateDrawingState, participants, saveWinnersToDatabase, updatePrizeQuota, lastDrawSession, isProcessing]);

  // Simplified: Button configuration - only start and stop (hide ready, stopping, default cases)
  const getButtonConfig = () => {
    if (isProcessing) {
      return {
      };
    }
    
    if (drawingPhase === 'generated') {
      return {
        text: 'MULAI UNDIAN',
        colors: 'from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500',
        disabled: false,
        glowColor: 'from-blue-400/20 to-indigo-500/20',
        icon: <Zap className="w-16 h-16" />
      };
    } else {
      // spinning
      return {
        text: 'STOP UNDIAN',
        colors: 'from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500',
        disabled: false,
        glowColor: 'from-red-400/20 to-pink-500/20',
        icon: <Square className="w-16 h-16" />
      };
    }
  };

  const buttonConfig = getButtonConfig();
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-950 relative overflow-hidden">
      {/* Enhanced: VIP Control Status Indicator */}
      {vipControlActive && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`flex items-center gap-2 px-4 py-2 backdrop-blur-sm text-white rounded-full shadow-lg ${
            vipControlStatus === 'completed' ? 'bg-green-600/90' :
            vipControlStatus === 'active' ? 'bg-yellow-600/90' : 'bg-purple-600/90'
          }`}>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {vipControlStatus === 'completed' ? 'VIP Selesai' :
               vipControlStatus === 'active' ? 'VIP Aktif' : 'Kontrol VIP'}
            </span>
            {processingStatus === 'complete' && (
              <CheckCircle className="w-4 h-4 text-green-300" />
            )}
            {processingStatus === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-300" />
            )}
          </div>
        </div>
      )}

      {/* Enhanced: Drawing Timer */}
      {isDrawing && (
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur-sm text-white rounded-full shadow-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Undian: {formatTime(drawingDuration)}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.div className="inline-flex items-center justify-center bg-transparent object-contain">
            {settings.eventLogo && (
              <img
                src={settings.eventLogo}
                alt="Logo Event"
                className="h-32 w-auto"
              />
            )}
          </motion.div>
        </motion.div>

        {/* Simplified: Single Large Control Button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="flex justify-center"
        >
          <motion.button
            onClick={handleMainButton}
            disabled={buttonConfig.disabled}
            whileHover={{ scale: buttonConfig.disabled ? 1 : 1.05 }}
            whileTap={{ scale: buttonConfig.disabled ? 1 : 0.95 }}
            className={`group relative px-16 py-20 rounded-3xl font-bold text-4xl lg:text-6xl transition-all duration-300 shadow-2xl ${
              buttonConfig.disabled
                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                : `bg-gradient-to-r ${buttonConfig.colors} text-white cursor-pointer`
            }`}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={
                  drawingPhase === 'spinning' && !isProcessing ? { rotate: 360 } :
                  isProcessing ? { rotate: 360 } : {}
                }
                transition={
                  (drawingPhase === 'spinning' && !isProcessing) || isProcessing 
                    ? { duration: 1, repeat: Infinity, ease: "linear" } : {}
                }
              >
                {buttonConfig.icon}
              </motion.div>
              <span className="text-center leading-tight">{buttonConfig.text}</span>
            </div>
            
            {!buttonConfig.disabled && (
              <motion.div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${buttonConfig.glowColor}`}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <p className="text-white/50 text-sm">
            Panel Kontrol VIP • Bayan Run 2025
          </p>
          {vipControlActive && (
            <p className="text-purple-300 text-xs mt-1">
              Mode Kontrol VIP Aktif 
            </p>
          )}
          
        </motion.div>
      </div>
    </div>
  );
};

export default VipPage;