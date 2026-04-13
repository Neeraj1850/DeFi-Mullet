import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  mode: 'lite' | 'pro';
  onToggle: (mode: 'lite' | 'pro') => void;
}

const ModeToggle: React.FC<Props> = ({ mode, onToggle }) => {
  return (
    <div 
      className="mode-toggle-container"
      onClick={() => onToggle(mode === 'lite' ? 'pro' : 'lite')}
    >
      <div className={`toggle-option ${mode === 'lite' ? 'active' : ''}`}>Lite</div>
      <div className={`toggle-option ${mode === 'pro' ? 'active' : ''}`}>Pro</div>
      
      <motion.div
        className="toggle-slider"
        initial={false}
        animate={{
          x: mode === 'lite' ? 0 : '100%',
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </div>
  );
};

export default ModeToggle;
