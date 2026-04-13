import { useContext } from 'react';
import { PortfolioContext } from '../providers/PortfolioProvider/PortfolioContext';

export const usePortfolioContext = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};

export const useBalances = () => usePortfolioContext().balances;
export const usePositions = () => usePortfolioContext().positions;
export const useSummary = () => usePortfolioContext().summary;
export const usePortfolioState = () => usePortfolioContext().state;
