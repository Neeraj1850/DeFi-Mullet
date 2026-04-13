import React, { createContext, useContext, useState, useRef } from 'react';

interface LoadingBarContextType {
  start: () => void;
  complete: () => void;
  progress: number;
  isVisible: boolean;
}

const LoadingBarContext = createContext<LoadingBarContextType | null>(null);

export const useLoadingBar = () => {
  const ctx = useContext(LoadingBarContext);
  if (!ctx) throw new Error('useLoadingBar must be inside LoadingBarProvider');
  return ctx;
};

export const LoadingBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    setIsVisible(true);
    setProgress(0);
    
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    
    // Animate to 80% slowly
    intervalRef.current = window.setInterval(() => {
      setProgress(p => {
        if (p >= 80) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          return 80;
        }
        return p + Math.random() * 10;
      });
    }, 200);
  };

  const complete = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setProgress(100);
    
    // Hide after animation finishes
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setProgress(0), 300); // reset after fade out
    }, 400); 
  };

  return (
    <LoadingBarContext.Provider value={{ start, complete, progress, isVisible }}>
      {children}
    </LoadingBarContext.Provider>
  );
};
