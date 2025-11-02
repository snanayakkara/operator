#!/bin/bash
# Force Chrome extension reload by clearing caches and rebuilding

echo "🧹 Cleaning old build..."
rm -rf dist/

echo "📦 Building fresh..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🔄 NOW DO THESE STEPS IN CHROME:"
echo "   1. Go to chrome://extensions/"
echo "   2. Find 'Operator' extension"
echo "   3. Click the REFRESH/RELOAD icon (circular arrow)"
echo "   4. Close and reopen the side panel"
echo "   5. Hard refresh the page (Cmd+Shift+R)"
echo ""
echo "If still not working:"
echo "   1. Toggle the extension OFF"
echo "   2. Wait 2 seconds"
echo "   3. Toggle it back ON"
echo "   4. Close ALL Chrome windows"
echo "   5. Reopen Chrome"
echo ""
