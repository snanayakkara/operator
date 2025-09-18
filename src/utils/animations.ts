/**
 * Animation utilities and constants for Framer Motion
 * Medical-appropriate, professional animations with accessibility support
 */
import { Transition, Variants } from 'framer-motion';

// Animation timing constants
export const ANIMATION_DURATIONS = {
  instant: 0,
  immediate: 0.15,      // Button hovers, immediate feedback
  quick: 0.2,           // State transitions, cards
  normal: 0.3,          // Modal entrances, complex transitions
  contextual: 0.5,      // Stagger sequences, loading states
  slow: 0.8,           // Complex sequences
} as const;

// Easing curves
export const ANIMATION_EASINGS = {
  // Standard Material Design curves
  standard: [0.4, 0.0, 0.2, 1],
  decelerate: [0.0, 0.0, 0.2, 1],
  accelerate: [0.4, 0.0, 1, 1],
  sharp: [0.4, 0.0, 0.6, 1],
  
  // Medical-appropriate custom curves
  gentle: [0.25, 0.46, 0.45, 0.94],
  professional: [0.4, 0.0, 0.2, 1],
  responsive: [0.34, 1.56, 0.64, 1],
} as const;

// Spring physics for medical UI
export const SPRING_CONFIGS = {
  gentle: { 
    type: "spring" as const, 
    damping: 25, 
    stiffness: 300,
    mass: 1 
  },
  responsive: { 
    type: "spring" as const, 
    damping: 30, 
    stiffness: 400,
    mass: 0.8 
  },
  bouncy: { 
    type: "spring" as const, 
    damping: 18, 
    stiffness: 300,
    mass: 1.2 
  },
  crisp: { 
    type: "spring" as const, 
    damping: 40, 
    stiffness: 500,
    mass: 0.6 
  }
} as const;

// Base transition configurations
export const createTransition = (duration: number, easing: number[] = ANIMATION_EASINGS.professional): Transition => ({
  duration,
  ease: easing,
  type: "tween"
});

export const createSpringTransition = (config: typeof SPRING_CONFIGS.gentle = SPRING_CONFIGS.gentle): Transition => config;

// Stagger configurations
export const STAGGER_CONFIGS = {
  tight: 0.03,      // Quick succession
  normal: 0.05,     // Standard stagger
  relaxed: 0.08,    // Spaced out
  dramatic: 0.12    // Emphasized sequence
} as const;

/**
 * Standard Card Animation Variants
 */
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.gentle)
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: createTransition(ANIMATION_DURATIONS.immediate, ANIMATION_EASINGS.sharp)
  }
};

/**
 * Button Interaction Variants
 */
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -1,
    transition: createSpringTransition(SPRING_CONFIGS.responsive)
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: createTransition(ANIMATION_DURATIONS.immediate, ANIMATION_EASINGS.sharp)
  },
  success: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 1],
      ease: ANIMATION_EASINGS.gentle
    }
  }
};

/**
 * Workflow Button Specific Variants
 */
export const workflowButtonVariants: Variants = {
  inactive: {
    scale: 1,
    opacity: 1,
    borderColor: "var(--line-primary)",
    backgroundColor: "var(--surface-primary)",
  },
  active: {
    scale: 1.02,
    opacity: 1,
    borderColor: "var(--accent-violet)",
    backgroundColor: "var(--surface-primary)",
    boxShadow: "0 0 0 1px var(--accent-violet-20)",
    transition: createSpringTransition(SPRING_CONFIGS.gentle)
  },
  recording: {
    scale: [1.02, 1.05, 1.02],
    borderColor: "var(--accent-red)",
    boxShadow: "0 0 20px var(--accent-red-20)",
    transition: {
      scale: {
        repeat: Infinity,
        duration: 2,
        ease: ANIMATION_EASINGS.gentle
      },
      borderColor: createTransition(ANIMATION_DURATIONS.quick),
      boxShadow: createTransition(ANIMATION_DURATIONS.quick)
    }
  },
  disabled: {
    scale: 1,
    opacity: 0.5,
    transition: createTransition(ANIMATION_DURATIONS.quick)
  }
};

/**
 * Stagger Container Variants
 */
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_CONFIGS.normal,
      delayChildren: 0.1,
      when: "beforeChildren"
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: STAGGER_CONFIGS.tight,
      staggerDirection: -1,
      when: "afterChildren"
    }
  }
};

/**
 * Modal Animation Variants
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: createSpringTransition(SPRING_CONFIGS.gentle)
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.sharp)
  }
};

/**
 * Backdrop Animation Variants
 */
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: "blur(0px)",
  },
  visible: {
    opacity: 1,
    backdropFilter: "blur(4px)",
    transition: createTransition(ANIMATION_DURATIONS.normal, ANIMATION_EASINGS.gentle)
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.sharp)
  }
};

/**
 * Slide Animation Variants
 */
export const slideVariants = {
  fromRight: {
    hidden: { x: "100%", opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: createSpringTransition(SPRING_CONFIGS.gentle)
    },
    exit: { 
      x: "100%", 
      opacity: 0,
      transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.sharp)
    }
  },
  fromLeft: {
    hidden: { x: "-100%", opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: createSpringTransition(SPRING_CONFIGS.gentle)
    },
    exit: { 
      x: "-100%", 
      opacity: 0,
      transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.sharp)
    }
  },
  fromBottom: {
    hidden: { y: "100%", opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: createSpringTransition(SPRING_CONFIGS.gentle)
    },
    exit: { 
      y: "100%", 
      opacity: 0,
      transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.sharp)
    }
  }
};

/**
 * Progress Animation Variants
 */
export const progressVariants: Variants = {
  indeterminate: {
    x: ["-100%", "100%"],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: ANIMATION_EASINGS.standard,
      repeatType: "loop"
    }
  },
  determinate: (progress: number) => ({
    width: `${progress}%`,
    transition: createSpringTransition(SPRING_CONFIGS.gentle)
  })
};

/**
 * Recording Animation Variants
 */
export const recordingVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: "0 0 0 rgba(239, 68, 68, 0)",
  },
  breathing: {
    scale: [1, 1.03, 1],
    transition: {
      repeat: Infinity,
      duration: 3,
      ease: ANIMATION_EASINGS.gentle
    }
  },
  recording: {
    scale: [1, 1.05, 1],
    boxShadow: [
      "0 0 20px rgba(239, 68, 68, 0.3)",
      "0 0 30px rgba(239, 68, 68, 0.6)",
      "0 0 20px rgba(239, 68, 68, 0.3)"
    ],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: ANIMATION_EASINGS.gentle
    }
  }
};

/**
 * Voice Activity Animation Variants
 */
export const voiceActivityVariants = {
  bar: (amplitude: number) => ({
    scaleY: Math.max(0.2, amplitude),
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      mass: 0.5
    }
  })
};

/**
 * Text Animation Variants
 */
export const textVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.gentle)
  }
};

/**
 * Success/Error State Variants
 */
export const statusVariants: Variants = {
  success: {
    backgroundColor: "var(--accent-emerald-10)",
    borderColor: "var(--accent-emerald)",
    scale: [1, 1.02, 1],
    transition: {
      scale: {
        duration: 0.6,
        times: [0, 0.3, 1],
        ease: ANIMATION_EASINGS.gentle
      },
      backgroundColor: createTransition(ANIMATION_DURATIONS.quick),
      borderColor: createTransition(ANIMATION_DURATIONS.quick)
    }
  },
  error: {
    backgroundColor: "var(--accent-red-10)",
    borderColor: "var(--accent-red)",
    x: [-2, 2, -2, 2, 0],
    transition: {
      x: {
        duration: 0.4,
        times: [0, 0.25, 0.5, 0.75, 1],
        ease: ANIMATION_EASINGS.sharp
      },
      backgroundColor: createTransition(ANIMATION_DURATIONS.quick),
      borderColor: createTransition(ANIMATION_DURATIONS.quick)
    }
  },
  warning: {
    backgroundColor: "var(--accent-amber-10)",
    borderColor: "var(--accent-amber)",
    transition: {
      backgroundColor: createTransition(ANIMATION_DURATIONS.quick),
      borderColor: createTransition(ANIMATION_DURATIONS.quick)
    }
  }
};

/**
 * List Item Variants for staggered lists
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: createTransition(ANIMATION_DURATIONS.quick, ANIMATION_EASINGS.gentle)
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: createTransition(ANIMATION_DURATIONS.immediate, ANIMATION_EASINGS.sharp)
  }
};

/**
 * Utility function to create reduced motion variants
 */
export const withReducedMotion = <T extends Variants>(variants: T): T => {
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) return variants;

  // Create reduced motion versions
  const reducedVariants = {} as T;
  
  Object.keys(variants).forEach(key => {
    const variant = variants[key];
    if (typeof variant === 'object' && variant !== null) {
      reducedVariants[key as keyof T] = {
        ...variant,
        transition: { duration: 0.01 }
      };
    } else {
      reducedVariants[key as keyof T] = variant;
    }
  });

  return reducedVariants;
};

/**
 * Hook to get reduced motion preference
 */
export const useReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia && 
         window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Custom transition for accessibility
 */
export const createAccessibleTransition = (duration: number): Transition => {
  const prefersReducedMotion = useReducedMotion();
  
  return prefersReducedMotion 
    ? { duration: 0.01 }
    : createTransition(duration, ANIMATION_EASINGS.professional);
};