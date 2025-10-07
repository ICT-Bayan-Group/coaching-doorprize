import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Winner, Participant } from '../types';
import { PerformanceOptimizer } from './useFirestore';

// Optimized interface with better type safety
interface DrawingState {
  shouldStartSlowdown: boolean;
  predeterminedWinners: Winner[];
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
 selectedPrizeName?: string | null;
  selectedPrizeImage?: string | null;
  selectedPrizeId?: string | null;
  selectedPrizeQuota: number;
  participants: Participant[];
  drawStartTime?: number;
  finalWinners?: Winner[];
  shouldStartSpinning: boolean;
  showWinnerDisplay: boolean;
  shouldResetToReady: boolean;
  vipProcessedWinners: boolean;
  vipControlActive: boolean;
  lastUpdated?: Date;
}

// Immutable default state for better performance
const DEFAULT_DRAWING_STATE: Readonly<DrawingState> = Object.freeze({
  shouldStartSlowdown: false,
  predeterminedWinners: [],
  isDrawing: false,
  currentWinners: [],
  showConfetti: false,
  selectedPrizeId: null,
  selectedPrizeQuota: 0,
  participants: [],
  shouldStartSpinning: false,
  showWinnerDisplay: false,
  shouldResetToReady: false,
  vipProcessedWinners: false,
  vipControlActive: false
});

// FIXED: Unified timestamp conversion function
const convertTimestamp = (value: any): Date => {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    // Check if date is valid
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
};

// FIXED: Process winner with proper timestamp handling
const processWinner = (winner: any): Winner => {
  const processedWinner: Winner = {
    ...winner,
    wonAt: convertTimestamp(winner.wonAt)
  };
  
  // Ensure all required Winner fields exist
  if (!processedWinner.id) processedWinner.id = `temp-${Date.now()}-${Math.random()}`;
  if (!processedWinner.name) processedWinner.name = 'Unknown';
  
  return processedWinner;
};

// FIXED: Process participant with proper timestamp handling  
const processParticipant = (participant: any): Participant => {
  const processedParticipant: Participant = {
    ...participant,
    addedAt: convertTimestamp(participant.addedAt)
  };
  
  // Ensure all required Participant fields exist
  if (!processedParticipant.id) processedParticipant.id = `temp-${Date.now()}-${Math.random()}`;
  if (!processedParticipant.name) processedParticipant.name = 'Unknown';
  
  return processedParticipant;
};

// FIXED: Comprehensive Firebase data processing with better error handling
const processFirebaseData = (data: any): DrawingState => {
  try {
    const processedData: DrawingState = {
      ...DEFAULT_DRAWING_STATE,
      ...data
    };

    // FIXED: Process arrays with validation and error handling
    if (data.currentWinners && Array.isArray(data.currentWinners)) {
      try {
        processedData.currentWinners = data.currentWinners.map((winner: any, index: number) => {
          try {
            return processWinner(winner);
          } catch (winnerError) {
            console.error(`Error processing winner at index ${index}:`, winnerError, winner);
            // Return a safe fallback winner
            return {
              id: `error-winner-${index}-${Date.now()}`,
              name: winner.name || 'Unknown Winner',
              wonAt: new Date(),
              prizeId: winner.prizeId || null,
              prizeName: winner.prizeName || null
            };
          }
        });
      } catch (error) {
        console.error('Error processing currentWinners array:', error);
        processedData.currentWinners = [];
      }
    }
    
    if (data.finalWinners && Array.isArray(data.finalWinners)) {
      try {
        processedData.finalWinners = data.finalWinners.map((winner: any, index: number) => {
          try {
            return processWinner(winner);
          } catch (winnerError) {
            console.error(`Error processing final winner at index ${index}:`, winnerError, winner);
            return {
              id: `error-final-winner-${index}-${Date.now()}`,
              name: winner.name || 'Unknown Winner',
              wonAt: new Date(),
              prizeId: winner.prizeId || null,
              prizeName: winner.prizeName || null
            };
          }
        });
      } catch (error) {
        console.error('Error processing finalWinners array:', error);
        processedData.finalWinners = [];
      }
    }

    if (data.predeterminedWinners && Array.isArray(data.predeterminedWinners)) {
      try {
        processedData.predeterminedWinners = data.predeterminedWinners.map((winner: any, index: number) => {
          try {
            return processWinner(winner);
          } catch (winnerError) {
            console.error(`Error processing predetermined winner at index ${index}:`, winnerError, winner);
            return {
              id: `error-predetermined-winner-${index}-${Date.now()}`,
              name: winner.name || 'Unknown Winner',
              wonAt: new Date(),
              prizeId: winner.prizeId || null,
              prizeName: winner.prizeName || null
            };
          }
        });
      } catch (error) {
        console.error('Error processing predeterminedWinners array:', error);
        processedData.predeterminedWinners = [];
      }
    }
    
    if (data.participants && Array.isArray(data.participants)) {
      try {
        processedData.participants = data.participants.map((participant: any, index: number) => {
          try {
            return processParticipant(participant);
          } catch (participantError) {
            console.error(`Error processing participant at index ${index}:`, participantError, participant);
            return {
              id: `error-participant-${index}-${Date.now()}`,
              name: participant.name || 'Unknown Participant',
              addedAt: new Date()
            };
          }
        });
      } catch (error) {
        console.error('Error processing participants array:', error);
        processedData.participants = [];
      }
    }

    // FIXED: Process timestamps with error handling
    if (data.lastUpdated) {
      try {
        processedData.lastUpdated = convertTimestamp(data.lastUpdated);
      } catch (error) {
        console.error('Error processing lastUpdated timestamp:', error);
        processedData.lastUpdated = new Date();
      }
    }

    return processedData;
  } catch (error) {
    console.error('Error in processFirebaseData:', error, data);
    // Return safe default state if processing completely fails
    return { ...DEFAULT_DRAWING_STATE };
  }
};

// Custom error class for better error handling
class DrawingStateError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DrawingStateError';
  }
}

export function useFirebaseDrawingState() {
  const [drawingState, setDrawingState] = useState<DrawingState>(DEFAULT_DRAWING_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent unnecessary re-renders
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isUnmountedRef = useRef(false);

  // Memoized document reference
  const docRef = useRef(doc(db, 'drawingState', 'current'));

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Effect for Firebase subscription
  useEffect(() => {
    isUnmountedRef.current = false;
    
    const handleSnapshot = (docSnap: any) => {
      // Prevent state updates if component is unmounted
      if (isUnmountedRef.current) return;

      try {
        const data = docSnap.exists() 
          ? processFirebaseData(docSnap.data())
          : DEFAULT_DRAWING_STATE;

        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Firebase state updated:', {
            isDrawing: data.isDrawing,
            currentWinners: data.currentWinners?.length || 0,
            vipProcessedWinners: data.vipProcessedWinners,
            vipControlActive: data.vipControlActive,
            source: docSnap.metadata.fromCache ? 'cache' : 'server'
          });
        }

        setDrawingState(data);
        setError(null);
      } catch (err) {
        console.error('Error processing Firebase data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set a safe fallback state
        setDrawingState(DEFAULT_DRAWING_STATE);
      } finally {
        setLoading(false);
      }
    };

    const handleError = (err: any) => {
      if (isUnmountedRef.current) return;
      
      console.error('Firebase subscription error:', err);
      setError(err.message || 'Firebase connection error');
      setLoading(false);
    };

    // Set up Firebase subscription
    unsubscribeRef.current = onSnapshot(
      docRef.current,
      handleSnapshot,
      handleError
    );

    // Cleanup on unmount
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, []); // Empty dependency array since docRef is stable

  // FIXED: Enhanced update function with comprehensive preprocessing
  const updateDrawingState = useCallback(async (updates: Partial<DrawingState>) => {
    if (!updates || Object.keys(updates).length === 0) {
      throw new DrawingStateError('No updates provided');
    }

    try {
      // FIXED: Use PerformanceOptimizer consistently with serverTimestamp for lastUpdated
      const processedUpdates = PerformanceOptimizer.prepareForFirestore({
        ...updates,
        lastUpdated: serverTimestamp() // Use serverTimestamp for consistency
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Updating Firebase drawing state:', {
          originalUpdates: updates,
          processedUpdates
        });
      }

      await updateDoc(docRef.current, processedUpdates);
    } catch (err: any) {
      // Handle document not found error
      if (err.code === 'not-found') {
        if (process.env.NODE_ENV === 'development') {
          console.log('Creating new Firebase drawing state document');
        }
        // FIXED: Use PerformanceOptimizer consistently with serverTimestamp
        await setDoc(docRef.current, PerformanceOptimizer.prepareForFirestore({ 
          ...DEFAULT_DRAWING_STATE, 
          ...updates, 
          lastUpdated: serverTimestamp() // Use serverTimestamp for consistency
        }));
      } else {
        console.error('Error updating drawing state:', err);
        setError(err.message);
        throw new DrawingStateError(
          `Failed to update drawing state: ${err.message}`,
          err.code
        );
      }
    }
  }, []);

  const resetDrawingState = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Resetting Firebase drawing state');
      }
      
      // FIXED: Use PerformanceOptimizer consistently with serverTimestamp
      await Promise.all([
        setDoc(docRef.current, PerformanceOptimizer.prepareForFirestore({ 
          ...DEFAULT_DRAWING_STATE, 
          lastUpdated: serverTimestamp() // Use serverTimestamp for consistency
        })),
        // Clear VIP flags from localStorage
        Promise.resolve().then(() => {
          try {
            localStorage.removeItem('vipProcessedWinners');
            localStorage.removeItem('vipDrawSession');
          } catch (storageErr) {
            // Handle localStorage errors gracefully (e.g., in private browsing)
            console.warn('Could not clear localStorage:', storageErr);
          }
        })
      ]);
    } catch (err: any) {
      console.error('Error resetting drawing state:', err);
      setError(err.message);
      throw new DrawingStateError(
        `Failed to reset drawing state: ${err.message}`,
        err.code
      );
    }
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return {
    drawingState,
    loading,
    error,
    updateDrawingState,
    resetDrawingState
  } as const;
}