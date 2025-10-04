import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  Unsubscribe,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Winner, Participant } from '../types';

// ===== TYPES =====
interface DrawingState {
  shouldStartSlowdown: boolean;
  predeterminedWinners: Winner[];
  isDrawing: boolean;
  currentWinners: Winner[];
  selectedPrizeName?: string;
  selectedPrizeImage?: string;
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

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface FirestoreHookResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  add: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMultiple: (ids: string[]) => Promise<void>;
  clear: () => Promise<void>;
  forceRefresh: () => void;
}

// ===== CONSTANTS =====
const DEFAULT_DRAWING_STATE: Readonly<DrawingState> = Object.freeze({
  shouldStartSlowdown: false,
  predeterminedWinners: [],
  isDrawing: false,
  currentWinners: [],
  selectedPrizeId: null,
  selectedPrizeQuota: 0,
  participants: [],
  shouldStartSpinning: false,
  showWinnerDisplay: false,
  shouldResetToReady: false,
  vipProcessedWinners: false,
  vipControlActive: false
});

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2
} as const;

const RETRYABLE_ERRORS = new Set([
  'unavailable',
  'deadline-exceeded', 
  'internal',
  'resource-exhausted'
]);

// ===== UTILITIES =====
export class PerformanceOptimizer {
  private static timestampCache = new WeakMap<any, Date>();
  private static dataCache = new WeakMap<any, any>();
  
  static convertTimestamp(value: any): Date {
    if (value instanceof Date) return value;
    
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      if (this.timestampCache.has(value)) {
        return this.timestampCache.get(value)!;
      }
      const date = value.toDate();
      this.timestampCache.set(value, date);
      return date;
    }
    
    return new Date(value);
  }
  
  static processFirestoreData<T>(data: any): T {
    if (this.dataCache.has(data)) {
      return this.dataCache.get(data);
    }
    
    const processed = this.deepProcessTimestamps(data);
    this.dataCache.set(data, processed);
    return processed;
  }
  
  private static deepProcessTimestamps(obj: any): any {
    if (obj instanceof Timestamp) {
      return this.convertTimestamp(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepProcessTimestamps(item));
    }
    
    if (obj && typeof obj === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.deepProcessTimestamps(value);
      }
      return processed;
    }
    
    return obj;
  }
  
  static prepareForFirestore(data: any): any {
    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.prepareForFirestore(item));
    }
    
    if (data && typeof data === 'object') {
      const prepared: any = {};
      for (const [key, value] of Object.entries(data)) {
        prepared[key] = this.prepareForFirestore(value);
      }
      return prepared;
    }
    
    return data;
  }
}

class RetryManager {
  private static calculateDelay(attempt: number): number {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
  }
  
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = (err) => RETRYABLE_ERRORS.has(err?.code)
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === RETRY_CONFIG.maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// ===== DRAWING STATE HOOK =====
export function useFirebaseDrawingState() {
  const [drawingState, setDrawingState] = useState<DrawingState>(DEFAULT_DRAWING_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isUnmountedRef = useRef(false);
  const docRef = useMemo(() => doc(db, 'drawingState', 'current'), []);
  
  // Optimized state comparison to prevent unnecessary updates
  const updateStateIfChanged = useCallback((newState: DrawingState) => {
    setDrawingState(current => {
      // Deep comparison for critical fields only
      if (
        current.isDrawing !== newState.isDrawing ||
        current.currentWinners.length !== newState.currentWinners.length ||
        current.vipProcessedWinners !== newState.vipProcessedWinners
      ) {
        return newState;
      }
      return current;
    });
  }, []);

  const handleSnapshot = useCallback((docSnap: DocumentSnapshot) => {
    if (isUnmountedRef.current) return;

    try {
      setConnectionStatus('connected');
      
      const data = docSnap.exists() 
        ? { ...DEFAULT_DRAWING_STATE, ...PerformanceOptimizer.processFirestoreData(docSnap.data()) }
        : DEFAULT_DRAWING_STATE;

      if (process.env.NODE_ENV === 'development') {
        console.log('Drawing state updated:', {
          isDrawing: data.isDrawing,
          winners: data.currentWinners?.length || 0,
          source: docSnap.metadata.fromCache ? 'cache' : 'server'
        });
      }

      updateStateIfChanged(data);
      setError(null);
    } catch (err) {
      console.error('Error processing drawing state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [updateStateIfChanged]);

  const handleError = useCallback((err: any) => {
    if (isUnmountedRef.current) return;
    
    console.error('Drawing state subscription error:', err);
    setError(err.message);
    setLoading(false);
    setConnectionStatus('disconnected');
    
    // Auto-reconnect after delay
    setTimeout(() => {
      if (!isUnmountedRef.current) {
        setConnectionStatus('reconnecting');
      }
    }, 2000);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    
    unsubscribeRef.current = onSnapshot(
      docRef,
      { includeMetadataChanges: false }, // Optimize: only server changes
      handleSnapshot,
      handleError
    );

    return () => {
      isUnmountedRef.current = true;
      unsubscribeRef.current?.();
    };
  }, [docRef, handleSnapshot, handleError]);

  const updateDrawingState = useCallback(async (updates: Partial<DrawingState>) => {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    return RetryManager.executeWithRetry(async () => {
      const processedUpdates = {
        ...PerformanceOptimizer.prepareForFirestore(updates),
        lastUpdated: serverTimestamp()
      };

      try {
        await updateDoc(docRef, processedUpdates);
        setConnectionStatus('connected');
      } catch (err: any) {
        if (err.code === 'not-found') {
          await setDoc(docRef, {
            ...DEFAULT_DRAWING_STATE,
            ...processedUpdates,
            created: serverTimestamp()
          });
        } else {
          throw err;
        }
      }
    });
  }, [docRef]);

  const resetDrawingState = useCallback(async () => {
    return RetryManager.executeWithRetry(async () => {
      await Promise.all([
        setDoc(docRef, {
          ...DEFAULT_DRAWING_STATE,
          lastUpdated: serverTimestamp(),
          resetAt: serverTimestamp()
        }),
        // Safely clear localStorage
        Promise.resolve().then(() => {
          try {
            localStorage.removeItem('vipProcessedWinners');
            localStorage.removeItem('vipDrawSession');
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }
        })
      ]);
      
      setDrawingState(DEFAULT_DRAWING_STATE);
    });
  }, [docRef]);

  const forceRefresh = useCallback(() => {
    setLoading(true);
    setConnectionStatus('reconnecting');
  }, []);

  return useMemo(() => ({
    drawingState,
    loading,
    error,
    connectionStatus,
    updateDrawingState,
    resetDrawingState,
    forceRefresh
  }), [drawingState, loading, error, connectionStatus, updateDrawingState, resetDrawingState, forceRefresh]);
}

// ===== GENERIC FIRESTORE HOOK =====
export function useFirestore<T extends { id: string }>(
  collectionName: string,
  orderByField?: string
): FirestoreHookResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isUnmountedRef = useRef(false);
  const dataHashRef = useRef<string>('');
  
  const queryRef = useMemo(() => {
    const collectionRef = collection(db, collectionName);
    return orderByField 
      ? query(collectionRef, orderBy(orderByField, 'desc'))
      : collectionRef;
  }, [collectionName, orderByField]);

  const handleSnapshot = useCallback((snapshot: QuerySnapshot) => {
    if (isUnmountedRef.current) return;

    try {
      setConnectionStatus('connected');
      
      const items: T[] = [];
      snapshot.forEach(doc => {
        const processedData = PerformanceOptimizer.processFirestoreData(doc.data());
        items.push({ id: doc.id, ...processedData } as T);
      });
      
      // Optimize: Only update if data actually changed
      const newHash = JSON.stringify(items.map(item => ({ id: item.id, ...item })));
      if (newHash !== dataHashRef.current) {
        dataHashRef.current = newHash;
        setData(items);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${collectionName}: Updated with ${items.length} items`);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error(`Error processing ${collectionName}:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  const handleError = useCallback((err: any) => {
    if (isUnmountedRef.current) return;
    
    console.error(`${collectionName} subscription error:`, err);
    setError(err.message);
    setLoading(false);
    setConnectionStatus('disconnected');
    
    setTimeout(() => {
      if (!isUnmountedRef.current) {
        setConnectionStatus('reconnecting');
      }
    }, 3000);
  }, [collectionName]);

  useEffect(() => {
    isUnmountedRef.current = false;
    
    unsubscribeRef.current = onSnapshot(
      queryRef,
      { includeMetadataChanges: false },
      handleSnapshot,
      handleError
    );

    return () => {
      isUnmountedRef.current = true;
      unsubscribeRef.current?.();
    };
  }, [queryRef, handleSnapshot, handleError]);

  const add = useCallback(async (item: Omit<T, 'id'>) => {
    return RetryManager.executeWithRetry(async () => {
      const processedItem = PerformanceOptimizer.prepareForFirestore(item);
      const collectionRef = collection(db, collectionName);
      await addDoc(collectionRef, processedItem);
    });
  }, [collectionName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    return RetryManager.executeWithRetry(async () => {
      const processedUpdates = PerformanceOptimizer.prepareForFirestore(updates);
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, processedUpdates);
    });
  }, [collectionName]);

  const remove = useCallback(async (id: string) => {
    return RetryManager.executeWithRetry(async () => {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    });
  }, [collectionName]);

  const removeMultiple = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    
    return RetryManager.executeWithRetry(async () => {
      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchIds = ids.slice(i, i + batchSize);
        
        batchIds.forEach(id => {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
        });
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
    });
  }, [collectionName]);

  const clear = useCallback(async () => {
    const ids = data.map(item => item.id);
    if (ids.length === 0) return;
    return removeMultiple(ids);
  }, [data, removeMultiple]);

  const forceRefresh = useCallback(() => {
    setLoading(true);
    setConnectionStatus('reconnecting');
    dataHashRef.current = '';
  }, []);

  return useMemo(() => ({
    data,
    loading,
    error,
    connectionStatus,
    add,
    update,
    remove,
    removeMultiple,
    clear,
    forceRefresh
  }), [data, loading, error, connectionStatus, add, update, remove, removeMultiple, clear, forceRefresh]);
}