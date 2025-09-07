import React, { useState } from 'react';
import { Copy as LucideCopy } from 'lucide-react';

// CSP-compatible animated copy icon wrapper
// - Renders lucide Copy with CSS-based animation
// - On hover/focus, triggers copy animation using CSS transforms
// - No eval() usage, fully Chrome extension CSP compliant

interface AnimatedCopyIconProps {
  className?: string;
  title?: string;
}

export const AnimatedCopyIcon: React.FC<AnimatedCopyIconProps> = ({ className = 'w-4 h-4', title }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = () => {
    setIsAnimating(true);
    // Reset animation after completion
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      className="relative inline-flex items-center justify-center group"
      aria-hidden={title ? undefined : true}
      title={title}
    >
      <LucideCopy 
        className={`${className} transition-transform duration-300 ${
          isAnimating ? 'animate-bounce' : 'group-hover:scale-110'
        }`} 
      />
    </span>
  );
};

export default AnimatedCopyIcon;
