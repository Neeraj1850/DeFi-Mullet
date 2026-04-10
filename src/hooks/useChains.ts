import { useState, useEffect } from 'react';
import { getChains } from '../api/earn';
import type { EarnChain } from '../types';

export const useChains = () => {
  const [chains, setChains] = useState<EarnChain[]>([]);

  useEffect(() => {
    getChains().then(setChains).catch(console.error);
  }, []);

  return chains;
};