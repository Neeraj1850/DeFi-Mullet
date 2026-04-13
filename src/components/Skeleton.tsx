import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  borderRadius = '8px',
  className = '',
  circle = false,
  style = {},
}) => {
  const baseStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : (typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius),
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    ...style,
  };

  return (
    <motion.div
      className={`skeleton-container ${className}`}
      style={baseStyle}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};

export default Skeleton;
