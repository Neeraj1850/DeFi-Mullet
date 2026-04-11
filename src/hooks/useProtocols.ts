import { useState, useEffect } from 'react';
import { getEarnProtocols } from '../api/earn';
import type { EarnProtocolMeta } from '../types';

export const useProtocols = () => {
  const [protocols, setProtocols] = useState<EarnProtocolMeta[]>([]);

  useEffect(() => {
    getEarnProtocols().then(setProtocols).catch(console.error);
  }, []);

  return protocols;
};