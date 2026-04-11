import { useState, useEffect } from 'react';
import { getEarnChains } from '../api/earn';
import type { EarnChain } from '../types';

export const useChains = () => {
  const [chains, setChains] = useState<EarnChain[]>([]);

  useEffect(() => {
    getEarnChains().then(setChains).catch(console.error);
  }, []);

  return chains;
};