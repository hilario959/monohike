import { createContext, useContext } from 'react';
import { useHikeRecorder } from '../hooks/useHikeRecorder';

const HikeRecorderContext = createContext<ReturnType<typeof useHikeRecorder> | null>(null);

export const HikeRecorderProvider = ({ children }: { children: React.ReactNode }) => {
  const recorder = useHikeRecorder();

  return (
    <HikeRecorderContext.Provider value={recorder}>
      {children}
    </HikeRecorderContext.Provider>
  );
};

export const useHikeRecorderContext = () => {
  const context = useContext(HikeRecorderContext);

  if (!context) {
    throw new Error('useHikeRecorderContext must be used within a HikeRecorderProvider');
  }

  return context;
};
