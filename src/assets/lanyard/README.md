# Lanyard Assets Required

This directory needs two files for the 3D lanyard component:

1. **card.glb** - 3D model file for the ID card
2. **lanyard.png** - Texture image for the lanyard band

## How to obtain these files:

### Option 1: Download from React Bits
Visit https://reactbits.dev/components/lanyard and look for download links for the assets.
The files are mentioned in their documentation under "src/assets/lanyard".

### Option 2: Create your own

**For card.glb:**
- Use any 3D modeling tool (Blender, etc.) to create a simple rectangular card with a clip at the top
- Export as .glb format
- Or use the online editor at https://modelviewer.dev/editor/ to edit an existing card model

**For lanyard.png:**
- Create a simple striped or solid colored texture
- Recommended size: 512x512px or similar
- Should tile well vertically for the lanyard band effect

### Option 3: Use placeholder (temporary)
The component will work with placeholder assets - you can customize the card texture later.

## Customization

Once you have the card.glb file, you can customize it using:
https://modelviewer.dev/editor/

This allows you to:
- Change the card texture to show "Ready to Record"
- Add a microphone icon
- Adjust colors and materials
- Make it match your medical app theme
