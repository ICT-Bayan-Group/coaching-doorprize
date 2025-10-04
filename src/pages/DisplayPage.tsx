import React, { useState, useEffect } from 'react';
import { Winner, AppSettings, Participant } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useFirebaseDrawingState } from '../hooks/useFirebaseDrawingState';

interface DrawingState {
  selectedPrizeQuota: number;
  isDrawing: boolean;
  currentWinners: Winner[];
  selectedPrizeName?: string;
  selectedPrizeImage?: string;
  participants: Participant[];
  drawStartTime?: number;
  finalWinners?: Winner[];
  shouldStartSpinning?: boolean;
  shouldResetToReady?: boolean;
  predeterminedWinners?: Winner[];
  shouldStartSlowdown?: boolean;
}

// Function untuk menentukan layout berdasarkan jumlah slot - Updated with larger text sizes
const getLayoutConfig = (drawCount: number) => {
  if (drawCount <= 5) {
    return { rows: 1, cols: drawCount, height: 'min-h-[450px]', textSize: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl', readyTextSize: 'text-2xl md:text-3xl lg:text-4xl', winnerTextSize: 'text-lg sm:text-xl' };
  } else if (drawCount <= 10) {
    return { rows: 2, cols: 5, height: 'min-h-[300px]', textSize: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl', readyTextSize: 'text-2xl md:text-3xl lg:text-4xl', winnerTextSize: 'text-lg sm:text-2xl' };
  } else if (drawCount <= 15) {
    return { rows: 3, cols: 5, height: 'min-h-[250px]', textSize: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl', readyTextSize: 'text-2xl md:text-3xl lg:text-4xl', winnerTextSize: 'text-lg sm:text-xl' };
  } else if (drawCount <= 20) {
    return { rows: 4, cols: 5, height: 'min-h-[200px]', textSize: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl', readyTextSize: 'text-xl md:text-2xl lg:text-3xl', winnerTextSize: 'text-lg sm:text-xl' };
  } else if (drawCount <= 25) {
    return { rows: 5, cols: 5, height: 'min-h-[180px]', textSize: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl', readyTextSize: 'text-xl md:text-2xl lg:text-3xl', winnerTextSize: 'text-base sm:text-lg' };
  } else if (drawCount <= 30) {
    return { rows: 6, cols: 5, height: 'min-h-[160px]', textSize: 'text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl', readyTextSize: 'text-lg md:text-xl lg:text-2xl', winnerTextSize: 'text-base sm:text-lg' };
  } else {
    return { rows: Math.ceil(drawCount / 6), cols: 6, height: 'min-h-[140px]', textSize: 'text-base sm:text-lg md:text-xl lg:text-2xl', readyTextSize: 'text-lg md:text-xl', winnerTextSize: 'text-sm sm:text-base' };
  }
};
const useOptimizedSpinning = (participants: Participant[], drawCount: number) => {
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantsRef = useRef(participants);
  
  // Pre-calculate random indices untuk performa lebih baik
  const getRandomIndices = useCallback((count: number, maxLength: number) => {
    const indices = new Set<number>();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * maxLength));
    }
    return Array.from(indices);
  }, []);

  useEffect(() => {
    if (isSpinning && participantsRef.current.length > 0) {
      // Gunakan requestAnimationFrame untuk animasi yang smooth
      const animate = () => {
        const randomIndices = getRandomIndices(drawCount, participantsRef.current.length);
        const newNames = randomIndices.map(i => participantsRef.current[i]?.name || '');
        setRollingNames(newNames);
        
        if (isSpinning) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isSpinning, drawCount, getRandomIndices]);

  return rollingNames;
};

// Function untuk membuat grid baris
const createGridRows = (drawCount: number, layoutConfig: { rows: any; cols: any; height?: string; textSize?: string; readyTextSize?: string; winnerTextSize?: string; }) => {
  const { rows, cols } = layoutConfig;
  const gridRows = [];
  
  for (let row = 0; row < rows; row++) {
    const startIndex = row * cols;
    const endIndex = Math.min(startIndex + cols, drawCount);
    const slotsInThisRow = endIndex - startIndex;
    
    if (slotsInThisRow > 0) {
      gridRows.push({
        startIndex,
        endIndex,
        slotsInThisRow,
        isLastRow: row === rows - 1
      });
    }
  }
  
  return gridRows;
};

const DisplayPage: React.FC = () => {
  // Firebase hooks
  const settingsHook = useFirestore<AppSettings & { id: string }>('settings');
  const { drawingState } = useFirebaseDrawingState();
  
  const settings = settingsHook.data[0] || {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    animationType: 'wheel',
    soundEnabled: true,
    backgroundMusic: false,
    multiDrawCount: 10
  };

  const [localState, setLocalState] = useState<DrawingState>({
    isDrawing: false,
    currentWinners: [],
    selectedPrizeName: undefined,
    selectedPrizeImage: undefined,
    participants: [],
    finalWinners: [],
    selectedPrizeQuota: 0,
    shouldStartSpinning: false,
    predeterminedWinners: []
  });
  
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const [participantsSnapshot, setParticipantsSnapshot] = useState<Participant[]>([]);
  const [hasShownResults, setHasShownResults] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSingleName, setCurrentSingleName] = useState<string>('');
  const [showFinalResults, setShowFinalResults] = useState(false);
  
  // Instant animation speed - no delays
  const ANIMATION_SPEED = 50; // Very fast update
  
  // State synchronization
  useEffect(() => {
    console.log('Firebase drawingState changed:', drawingState);
    
    // Update local state with all Firebase changes
    setLocalState(prevState => ({
      ...prevState,
      ...drawingState
    }));
    
    // Handle spinning state changes
    if (drawingState.shouldStartSpinning !== undefined) {
      setIsSpinning(drawingState.shouldStartSpinning);
      console.log('Spinning state updated:', drawingState.shouldStartSpinning);
    }
    
    // Immediately show final results when slowdown is triggered
    if (drawingState.shouldStartSlowdown && !showFinalResults) {
      console.log('Immediately showing final results');
      setShowFinalResults(true);
      setIsSpinning(false);
      
      // Set winners immediately
      const predeterminedWinners = drawingState.predeterminedWinners || [];
      if (predeterminedWinners.length > 0) {
        if (drawingState.selectedPrizeQuota === 1) {
          setCurrentSingleName(predeterminedWinners[0].name);
        } else {
          setRollingNames(predeterminedWinners.map((w: { name: any; }) => w.name));
        }
      }
    }
  }, [drawingState, showFinalResults]);

  // Handle drawing state changes
  useEffect(() => {
    console.log('State change detected:', {
      isDrawing: drawingState.isDrawing,
      shouldStartSpinning: drawingState.shouldStartSpinning,
      currentIsSpinning: isSpinning,
      hasShownResults: hasShownResults
    });

    // Reset results when starting a new draw
    if (drawingState.isDrawing && !localState.isDrawing) {
      console.log('New draw started - resetting results');
      setHasShownResults(false);
      setParticipantsSnapshot(drawingState.participants || []);
      setShowFinalResults(false);
    }
    
    // Clear results when winners are cleared
    if (!drawingState.currentWinners?.length && localState.currentWinners?.length > 0) {
      console.log('Winners cleared');
      setHasShownResults(false);
      setShowFinalResults(false);
    }
  }, [drawingState.isDrawing, drawingState.shouldStartSpinning, drawingState.currentWinners, drawingState.finalWinners, localState.isDrawing, localState.currentWinners]);

  // Handle final results display - NO AUTO-REDIRECT, controlled by admin
  useEffect(() => {
    if (showFinalResults) {
      console.log('Showing final results - staying until admin control');
      // No timer - results stay visible until admin clears them
    }
  }, [showFinalResults]);

  // Multi-slot animation - fast and direct
  useEffect(() => {
    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota > 1 && !showFinalResults) {
      
      const drawCount = Math.min(localState.selectedPrizeQuota, participantsSnapshot.length);
      console.log('Starting fast multi-slot animation for', drawCount, 'slots');
      
      const interval = setInterval(() => {
        const newRollingNames = [];
        
        for (let i = 0; i < drawCount; i++) {
          const randomParticipant = participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)];
          newRollingNames.push(randomParticipant?.name || '');
        }
        
        setRollingNames(newRollingNames);
      }, ANIMATION_SPEED);
  
      return () => {
        console.log('Clearing multi-slot animation interval');
        clearInterval(interval);
      };
    } else {
      if (!showFinalResults) {
        setRollingNames([]);
      }
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, showFinalResults]);

  // Single name animation - fast and direct
  useEffect(() => {
    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota === 1 && !showFinalResults) {
      
      console.log('Starting fast single-name animation');
      
      const interval = setInterval(() => {
        // Show random names quickly
        const randomParticipant = participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)];
        setCurrentSingleName(randomParticipant?.name || '');
      }, ANIMATION_SPEED);

      return () => {
        console.log('Clearing single-name animation interval');
        clearInterval(interval);
      };
    } else if (!localState.isDrawing && !showFinalResults) {
      setCurrentSingleName('');
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, showFinalResults]);

  const prizeQuota = localState.selectedPrizeQuota || 1;
  const drawCount = Math.min(prizeQuota, participantsSnapshot.length || localState.participants?.length || 0);

  // Show loading state
  if (settingsHook.loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-red-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mx-auto mb-6"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 10,
        }}
      >

        <div className="fixed inset-0 bg-gradient-to-b from-red-900 to-slate-900 flex flex-col text-slate-800 overflow-hidden">
          {/* Prize Image - Positioned at bottom right corner, cropped */}
          {localState.selectedPrizeImage && (
            <div className="absolute bottom-0 right-0 z-0 overflow-hidden">
              <img
                src={localState.selectedPrizeImage}
                alt="Prize"
                className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem] 2xl:w-[48rem] 2xl:h-[48rem] object-cover translate-x-1/4 translate-y-1/4"
                style={{ 
                  transform: 'translate(25%, 25%)',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Header with Logo */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-12 z-20">
            {settings.eventLogo && (
              <img
                src={settings.eventLogo}
                alt="Event Logo"
                className="h-32 w-auto"
              />
            )}
          </div>

          {/* Prize Name - Centered at top */}
          {localState.selectedPrizeName && (localState.isDrawing || showFinalResults) && (
            <div className="absolute top-24 left-0 right-0 z-20">
              <div className="text-center">
                <div className="bg-gradient-to-b from-red-900 to-slate-900 backdrop-blur-sm rounded-2xl px-8 py-4 mx-auto inline-block shadow-xl">

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase">
                    {localState.selectedPrizeName}
                  </h1>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-6 pt-32 relative z-10">
            {localState.isDrawing || showFinalResults ? (
              // Drawing Animation or Final Results
              prizeQuota === 1 ? (
                // Single Name Picker for quota 1
                <div className="text-center">
                  <div className="relative overflow-hidden max-w-8xl mx-auto">
                    <div className="relative z-10">
                      <div className="h-60 flex items-center justify-center mb-12">
                        {!isSpinning && !showFinalResults ? (
                          <div className="text-center">
                            <span className="text-[16rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-white mb-4 block uppercase">
                              Ready
                            </span>
                          </div>
                        ) : (
                          <div className="text-center px-8">
                            <div className={`px-26 py-24 ${
                              showFinalResults
                                ? 'border-transparent bg-transparent shadow-transparent' 
                                : 'bg-transparent shadow-transparent'
                            }`}>
                              {/* Name */}
                              <span className={`font-bold whitespace-nowrap overflow-visible max-w-full text-4xl md:text-8xl ${
                                showFinalResults ? 'text-8xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-white mb-4' : 'text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-white mb-4'

                              }`}>
                                {currentSingleName || (showFinalResults ? localState.finalWinners?.[0]?.name : '') || '...'}
                              </span>
                              
                              {showFinalResults && (
                                <div className="text-6xl mt-4 text-white/80 font-bold">
                                  PEMENANG!
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Multi Slot Machines untuk semua ukuran (5-30+ slot)
                <div className="w-full px-6">
                  <div className="mx-auto max-w-10xl">
                    {(() => {
                      const layoutConfig = getLayoutConfig(drawCount);
                      const gridRows = createGridRows(drawCount, layoutConfig);
                      
                      return (
                        <div className="space-y-3">
                          {gridRows.map((rowData, rowIndex) => (
                            <div 
                              key={rowIndex}
                              className={`grid gap-3 justify-center ${
                                rowData.slotsInThisRow === 6 ? 'grid-cols-6' :
                                rowData.slotsInThisRow === 5 ? 'grid-cols-5' : 
                                rowData.slotsInThisRow === 4 ? 'grid-cols-4' : 
                                rowData.slotsInThisRow === 3 ? 'grid-cols-3' : 
                                rowData.slotsInThisRow === 2 ? 'grid-cols-2' : 'grid-cols-1'
                              }`}
                            >
                              {Array.from({ length: rowData.slotsInThisRow }).map((_, colIndex) => {
                                const actualIndex = rowData.startIndex + colIndex;
                                return (
                                  <div key={actualIndex} className="relative">
                                    {/* Slot Machine */}
                                    <div className="border-transparent">
                                      <div className="relative z-10 h-full flex flex-col">
                                        {/* Main Display Area */}
                                        <div className="flex-1 flex items-center justify-center relative">
                                          <div className={`w-full ${layoutConfig.height} bg-transparent overflow-hidden relative`}>
                                            {/* Show "Ready" state when not spinning */}
                                            {!isSpinning && !showFinalResults ? (
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="text-center">
                                                  <div className="bg-green-400 rounded-lg px-4 py-3 shadow-md">
                                                    <span className={`${layoutConfig.readyTextSize} font-bold text-white block`}>
                                                      Ready
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              /* Rolling Name or Final Result */
                                              <div className="absolute inset-0 flex items-center justify-center p-2">
                                                <div className="text-center w-full">
                                                  <div className={`rounded-lg px-3 py-2 shadow-lg ${
                                                    showFinalResults
                                                      ? 'bg-green-100' 
                                                      : 'bg-white'
                                                  }`}>
                                                    {/* Name */}
                                                    <span className={`${layoutConfig.textSize} font-bold block break-words leading-tight ${
                                                      showFinalResults ? 'text-black' : 'text-black'
                                                    }`}>
                                                      {rollingNames[actualIndex] || (showFinalResults ? localState.finalWinners?.[actualIndex]?.name : '') || '...'}
                                                    </span>
                                                    
                                                    {showFinalResults && (
                                                      <div className={`${layoutConfig.winnerTextSize} mt-1 text-green-500 font-bold`}>
                                                        WINNER!
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {showFinalResults && (
                    <div className="text-center mt-8">
                      {/* Konten tambahan jika diperlukan */}
                    </div>
                  )}
                </div>
              )
            ) : (
              // Ready State
              <div className="text-center">
                <div className="text-8xl font-bold text-white uppercase">
                  Ready
                </div>       
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DisplayPage;