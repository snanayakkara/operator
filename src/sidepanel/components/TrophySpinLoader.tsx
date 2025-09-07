import React from 'react';
import { TrophySpin } from 'react-loading-indicators';

interface TrophySpinLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  speedPlus?: number;
  className?: string;
}

const sizeMap = {
  sm: 14,   // Small spinner for buttons (reduced from 16)
  md: 20,   // Medium for inline elements (reduced from 24)
  lg: 32,   // Large for main loading states
  xl: 48    // Extra large for full screen loading
};

export const TrophySpinLoader: React.FC<TrophySpinLoaderProps> = ({
  size = 'md',
  color = '#3b82f6', // Blue-600 by default
  speedPlus = 1,
  className = ''
}) => {
  const pixelSize = sizeMap[size];
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <TrophySpin 
        color={color}
        size={pixelSize as any}
        speedPlus={speedPlus as any}
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`
        }}
      />
    </div>
  );
};

// Specific variants for common use cases
export const SmallTrophySpin: React.FC<{ className?: string }> = ({ className }) => (
  <TrophySpinLoader size="sm" className={className} />
);

export const MediumTrophySpin: React.FC<{ className?: string; color?: string }> = ({ className, color }) => (
  <TrophySpinLoader size="md" color={color} className={className} />
);

export const LargeTrophySpin: React.FC<{ className?: string }> = ({ className }) => (
  <TrophySpinLoader size="lg" className={className} />
);

export const ProcessingTrophySpin: React.FC<{ className?: string }> = ({ className }) => (
  <TrophySpinLoader 
    size="md" 
    color="#7c3aed" // Purple-600 for processing states
    speedPlus={2} 
    className={className} 
  />
);