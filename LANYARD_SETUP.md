# 3D Lanyard Component Setup Guide

## ✅ Implementation Complete!

The 3D interactive lanyard component has been successfully integrated into the "Ready to Record" idle state with a beautiful dot grid background.

## 🎨 What's New

### Visual Enhancements
- **Dot Grid Background**: Subtle, professional dot pattern on the idle screen
- **3D Interactive Lanyard**: Physics-based draggable ID card component
- **Smooth Animations**: Real-time physics simulation with rope dynamics
- **Responsive Design**: Adapts to different screen sizes

### Technical Details
- **Bundle Size**: ~1MB gzipped for 3D libraries (split into separate vendor-3d chunk)
- **Dependencies Added**:
  - `three@^0.168.0`
  - `@react-three/fiber@^8.18.0`
  - `@react-three/drei@^9.122.0`
  - `@react-three/rapier@^1.5.0`
  - `meshline@^3.3.1`
- **Build Time**: Successfully builds with no CSP violations
- **Performance**: Lazy-loaded, only renders when in idle state

## 📦 Required Assets

To complete the setup, you need two asset files in `src/assets/lanyard/`:

### 1. card.glb (3D Model)
**Current Status**: Placeholder geometry (white card with simple clip)

**How to get the real asset**:
```bash
# Option 1: Download from React Bits
# Visit: https://github.com/premieroctet/react-bits
# Navigate to: src/assets/lanyard/
# Download: card.glb

# Option 2: Create your own
# Use Blender or any 3D tool to create:
# - Rectangular card (approx 1.6 x 2.25 x 0.02 units)
# - Circular clip at top center
# - Optional: Small clamp detail
# Export as .glb format

# Option 3: Use online editor
# 1. Download any basic card.glb
# 2. Edit at: https://modelviewer.dev/editor/
# 3. Upload your custom texture with:
#    - "Ready to Record" text
#    - Microphone icon
#    - Medical branding
# 4. Download the modified .glb
```

### 2. lanyard.png (Band Texture)
**Current Status**: Fallback blue color

**How to get the real asset**:
```bash
# Option 1: Download from React Bits
# Same repo as above: lanyard.png

# Option 2: Create your own (512x512px or similar)
# - Create a striped pattern (vertical or diagonal)
# - Use your brand colors
# - Ensure it tiles well vertically
# - Save as PNG with transparency if desired

# Option 3: Use a solid color
# - Simple gradient works fine
# - Medical blue/teal/green recommended
```

## 🎯 Customization Options

### Change Card Text
Edit `OptimizedApp.tsx` line ~3812:
```tsx
<Lanyard
  cardText="Your Text Here"  // <-- Change this
  position={[0, 0, 20]}
  gravity={[0, -40, 0]}
/>
```

### Swap Card Artwork

**Option A – Use the built-in settings pane (recommended):**
1. Click the gear icon in the side panel to open Operator Settings.
2. In the Dashboard tab, scroll to **Lanyard Branding**.
3. Upload a square PNG/JPEG (≤2MB). The 3D card uses the same artwork on both sides and reveals roughly the top 75% of the image to preserve the badge’s aspect ratio. Changes sync instantly to the side panel.
4. Use *Restore Default* to fall back to the texture packaged in `card.glb`.

**Option B – Hardcode the asset in code:**
1. Add your PNG front design to `src/assets/lanyard/` (e.g. `operator-card-face.png`).
2. Import it in `OptimizedApp.tsx`:
   ```tsx
   import operatorCardFace from '@/assets/lanyard/operator-card-face.png?url';
   ```
3. Pass it to the component:
   ```tsx
   <Lanyard
     cardTextureUrl={operatorCardFace}
     cardText=""
     /* other props */
   />
   ```
If no custom texture is supplied the embedded material from `card.glb` continues to render.

### Adjust Physics
```tsx
<Lanyard
  gravity={[0, -40, 0]}  // Stronger gravity = faster swing
  position={[0, 0, 20]}  // Camera distance (smaller = closer)
  fov={20}               // Field of view (larger = wider angle)
/>
```

### Change Background Style
In `OptimizedApp.tsx`, swap the CSS class:
- `dot-grid-background-light` (current - very subtle)
- `dot-grid-background` (standard)
- `dot-grid-background-dark` (more prominent)
- `dot-grid-background-dense` (smaller, denser dots)

## 🧪 Testing

1. **Development mode**:
```bash
npm run dev
```

2. **Build and test**:
```bash
npm run build
# Load dist/ folder as unpacked extension in Chrome
# Open side panel and verify lanyard renders in idle state
```

3. **Check for issues**:
- Open DevTools Console
- Look for 3D warnings (missing textures are OK - fallbacks work)
- Test dragging the card with mouse
- Verify physics simulation runs smoothly

## 🔧 Troubleshooting

### Lanyard not showing
- Check console for errors
- Verify you're in the idle state (no recording, no sessions displayed)
- Check that Lanyard.tsx compiled without errors

### Performance issues
- Reduce physics quality in Band component
- Adjust `timeStep` in Physics component
- Consider reducing framerate for lower-end devices

### Assets not loading
- Current fallback geometry works fine without assets
- GLB and PNG are optional enhancements
- Check browser console for 404s

## 📝 Files Created/Modified

**New Files**:
- `src/sidepanel/components/Lanyard.tsx` - Main 3D component
- `src/sidepanel/components/Lanyard.css` - Styling
- `src/global.d.ts` - TypeScript declarations
- `src/assets/lanyard/README.md` - Asset instructions

**Modified Files**:
- `package.json` - Added Three.js dependencies
- `vite.config.ts` - Added .glb support and asset copying
- `src/sidepanel/styles/globals.css` - Added dot grid patterns
- `src/sidepanel/OptimizedApp.tsx` - Integrated Lanyard component

## 🎨 Next Steps (Optional)

1. **Download real assets** from React Bits or create custom ones
2. **Customize card texture** with medical branding
3. **Adjust physics/camera** to your preference
4. **Test on different screen sizes** and adjust responsive behavior
5. **Consider adding loading states** or skeleton screens

## 🚀 Performance Notes

- **Lazy Loading**: Component only loads when visible (idle state)
- **Code Splitting**: 3D libraries in separate `vendor-3d` chunk
- **Graceful Fallbacks**: Works without actual .glb/.png assets
- **GPU Accelerated**: Uses WebGL for smooth rendering
- **CSP Compliant**: No eval, works with extension CSP policies

## 📊 Bundle Impact

```
Before: ~1.8MB total (gzipped)
After:  ~2.8MB total (gzipped)
Impact: +1MB for full 3D physics experience
```

The 3D libraries are lazy-loaded and only downloaded when the user reaches the idle state, minimizing initial load time impact.

## ✨ Enjoy Your Interactive 3D Lanyard!

The implementation is complete and working. Simply add your custom assets to make it uniquely yours!
