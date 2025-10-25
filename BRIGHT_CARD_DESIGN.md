# Bright Card Design System

Inspired by macOS Big Sur and the reference UI design, this design system provides bright, high-contrast cards with prominent borders and subtle gradient backgrounds.

## Overview

The bright card design differs from the existing subtle card design in the following ways:

| Feature | Subtle Design (Current) | Bright Design (New) |
|---------|------------------------|---------------------|
| Background | Pastel fills (red-50, emerald-50) | White with light gradients |
| Border Width | 2px | 2-3px (more prominent) |
| Border Color | Color-matched (red-200, emerald-200) | White or light color accents |
| Corner Radius | 8-12px | 12-16px (softer) |
| Shadow | Multiple shadow utilities | Minimal (border-focused) |
| Contrast | Lower (pastel backgrounds) | Higher (white backgrounds) |
| Visual Weight | Distributed color | Border-emphasized |

## Components

### 1. BrightCard (Reusable Component)

Located in: `src/components/BrightCard.tsx`

**Features:**
- Composable sub-components (Icon, Title, Description, Badge)
- Multiple variant colors (default, blue, purple, emerald, amber, rose)
- Three sizes (sm, md, lg)
- Optional elevated shadow
- Click handler support

**Example Usage:**

```tsx
import { BrightCard } from '@/components/BrightCard';
import { Users } from 'lucide-react';

// Basic card
<BrightCard variant="blue" size="md">
  <BrightCard.Icon>
    <Users className="w-6 h-6" />
  </BrightCard.Icon>
  <BrightCard.Title>Application Groups</BrightCard.Title>
  <BrightCard.Description>
    Create rules that apply to all macOS or Simulator processes.
  </BrightCard.Description>
</BrightCard>

// Clickable card with badge
<BrightCard
  variant="emerald"
  onClick={() => console.log('clicked')}
  elevated
>
  <BrightCard.Badge variant="emerald">New</BrightCard.Badge>
  <BrightCard.Title>Feature</BrightCard.Title>
  <BrightCard.Description>Click to learn more</BrightCard.Description>
</BrightCard>
```

### 2. IndividualFindingCard (Enhanced)

Located in: `src/sidepanel/components/IndividualFindingCard.tsx`

**New Prop:** `useBrightDesign?: boolean`

**Example:**

```tsx
<IndividualFindingCard
  finding={finding}
  index={index}
  isCompleted={false}
  onToggleComplete={handleToggle}
  useBrightDesign={true}  // Enable bright design
/>
```

**Visual Changes with `useBrightDesign={true}`:**
- White gradient backgrounds instead of pastel fills
- Prominent colored borders (rose-300, amber-300, emerald-300)
- Larger corner radius (rounded-bright = 16px)
- Minimal shadow (shadow-bright-card)
- Higher text contrast

### 3. BatchPatientReviewResults (Pass-through)

Located in: `src/sidepanel/components/BatchPatientReviewResults.tsx`

**New Prop:** `useBrightCards?: boolean`

Automatically passes the bright design flag to all child `IndividualFindingCard` components.

### 4. AIReviewCards (Top-level)

Located in: `src/sidepanel/components/results/AIReviewCards.tsx`

**New Prop:** `useBrightCards?: boolean`

Entry point for enabling bright card design in AI Medical Review results.

## Tailwind Utilities

### Border Radius
```css
.rounded-bright      /* 16px - Main bright card radius */
.rounded-bright-sm   /* 12px - Smaller bright cards */
```

### Border Width
```css
.border-bright       /* 2px - Prominent borders */
.border-bright-thick /* 3px - Extra prominent */
```

### Shadows
```css
.shadow-bright-card      /* Minimal: 0 1px 3px rgba(0,0,0,0.08) */
.shadow-bright-elevated  /* Elevated: 0 4px 12px rgba(0,0,0,0.1) */
```

### Background Gradients
```css
.bg-gradient-bright         /* Neutral gray */
.bg-gradient-bright-blue    /* Light blue */
.bg-gradient-bright-purple  /* Light purple */
.bg-gradient-bright-emerald /* Light emerald */
.bg-gradient-bright-amber   /* Light amber */
.bg-gradient-bright-rose    /* Light rose */
```

## Design Principles

### 1. High Contrast
Bright white backgrounds with dark text ensure maximum readability in medical contexts.

### 2. Border-Focused Elevation
Instead of relying on shadows, elevation is communicated through prominent borders and subtle shadow hints.

### 3. Generous Whitespace
Larger padding and corner radius create breathing room and a modern, approachable feel.

### 4. Subtle Color Accents
Color is used strategically in borders and badges rather than flooding backgrounds.

### 5. Consistent Visual Language
All bright cards share the same radius, border width, and shadow patterns for visual cohesion.

## Migration Guide

### Enabling Bright Design for AI Review

**Current (Subtle):**
```tsx
<AIReviewCards reviewData={data} />
```

**Bright:**
```tsx
<AIReviewCards reviewData={data} useBrightCards={true} />
```

### Creating Custom Bright Cards

**Simple:**
```tsx
<BrightCard variant="default">
  <div>Your content</div>
</BrightCard>
```

**Structured:**
```tsx
<BrightCard variant="purple" size="lg" elevated>
  <BrightCard.Icon>
    <Activity className="w-8 h-8" />
  </BrightCard.Icon>
  <BrightCard.Title>Medical Finding</BrightCard.Title>
  <BrightCard.Description>
    Detailed clinical information...
  </BrightCard.Description>
  <BrightCard.Badge variant="purple">High Priority</BrightCard.Badge>
</BrightCard>
```

## Browser Compatibility

All utilities use standard CSS properties supported in:
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

## Performance

- No runtime JavaScript required
- Pure CSS gradients and borders
- Optimized for Chrome side panel constraints (320px width)

## Future Enhancements

- [ ] Dark mode variants
- [ ] Animation presets (hover, expand, etc.)
- [ ] Additional size variants (xs, xl)
- [ ] Accessibility improvements (ARIA labels, focus states)
- [ ] Storybook documentation

## Reference

See the macOS Big Sur System Preferences design for visual inspiration.
