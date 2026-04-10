import { useState, useEffect } from 'react';
import { getProtocols } from '../api/earn';
import type { EarnProtocolMeta } from '../types';

export const useProtocols = () => {
  const [protocols, setProtocols] = useState<EarnProtocolMeta[]>([]);

  useEffect(() => {
    getProtocols().then(setProtocols).catch(console.error);
  }, []);

  return protocols;
};