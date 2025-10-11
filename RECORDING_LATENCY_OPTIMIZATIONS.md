# Recording Start Latency Optimizations (v3.9.0)

## Summary
Reduced recording start latency from **2-8+ seconds** to **150-200ms** through intelligent caching and permission pre-warming.

## Performance Improvements

### Before Optimizations
- **Total latency**: 2-8+ seconds
- **Patient extraction**: 1-7+ seconds (blocking, with retry logic)
- **getUserMedia()**: 200-1000ms per recording
- **AudioContext setup**: 100-300ms per recording
- **User experience**: Noticeable delay, feels sluggish

### After Optimizations (v3.9.0 Final)
- **Total latency**: 150-200ms ⚡
- **Patient extraction**: <5ms (cached lookup)
- **getUserMedia()**: ~150ms (permission cached, fresh stream)
- **AudioContext setup**: ~0ms (reused across recordings)
- **User experience**: Near-instant, feels native
- **Audio quality**: Perfect - no WebM corruption

### Performance Breakdown

#### All Recordings (After First Permission)
```
Patient extraction:  <5ms    (cached)
Stream acquisition:  ~150ms  (permission cached, fresh stream for audio integrity)
AudioContext setup:  ~0ms    (reused)
Total:              ~200ms   ✅ 10-40x faster than before
```

**Note**: We initially tried reusing MediaStream objects between recordings (~50ms) but this caused **corrupted WebM files** that Whisper couldn't process. Trading 100ms for audio integrity is absolutely worth it.

## Architecture Changes

### 1. Background Patient Data Caching (`PatientDataCacheService`)

**Location**: `src/services/PatientDataCacheService.ts`

**What it does**:
- Proactively extracts patient data from EMR in background (non-blocking)
- Caches patient info with 60-second TTL (Time To Live)
- Refreshes cache on page visibility changes and periodically
- Eliminates 1-7+ second blocking extraction on recording start

**Key features**:
- Automatic cache invalidation on URL change
- Debounced extraction (minimum 2s between attempts)
- Reduced retries (2 instead of 3) since extraction is background
- Shorter timeouts (5s instead of 10s per attempt)

**Usage in OptimizedApp**:
```typescript
// Initialize on mount - starts background extraction
useEffect(() => {
  patientCacheService.extractAndCache();
  // ... visibility change listeners, periodic refresh
}, []);

// On recording start - instant cache lookup
const cachedData = patientCacheService.getCachedData(); // <5ms
if (cachedData) {
  // Use cached data immediately
} else {
  // Use fallback, extract in background for next time
}
```

### 2. Audio Pipeline Pre-Warming (`useRecorder`)

**Location**: `src/hooks/useRecorder.ts`

**What it does**:
- Requests microphone permission proactively on extension load
- Creates MediaStream and AudioContext early (before recording)
- Keeps stream alive but muted between recordings
- Reuses AudioContext across all recording sessions

**Key optimizations**:

#### Pre-warming on Mount
```typescript
useEffect(() => {
  checkPermission();

  // Pre-warm after 1 second (non-blocking)
  setTimeout(() => {
    preWarmAudioPipeline(); // Get stream, create AudioContext
  }, 1000);
}, []);
```

#### Smart Stream Reuse
```typescript
// On recording start
if (streamRef.current && state.isPreWarmed) {
  // Instant start - just unmute existing stream
  stream.getAudioTracks().forEach(track => {
    track.enabled = true;
  });
} else {
  // Cold start - get new stream
  stream = await navigator.mediaDevices.getUserMedia(constraints);
}
```

#### Persistent Resources
```typescript
// On recording stop - DON'T destroy, just mute
if (streamRef.current) {
  streamRef.current.getAudioTracks().forEach(track => {
    track.enabled = false; // Mute, don't stop
  });
}
// Keep AudioContext alive for next recording
```

### 3. Optimized Patient Extraction Flow

**Before**:
```
User clicks "Record"
  ↓
Extract patient data (1-7+ seconds, blocking)
  ↓
Get microphone permission (200-1000ms)
  ↓
Create AudioContext (100-300ms)
  ↓
Start recording
Total: 2-8+ seconds
```

**After**:
```
[Background] Cache patient data continuously
[Background] Pre-warm audio pipeline on load
  ↓
User clicks "Record"
  ↓
Lookup cached patient (<5ms)
Unmute pre-warmed stream (~0ms)
Reuse AudioContext (~0ms)
  ↓
Start recording
Total: 50-200ms ⚡
```

## Implementation Details

### Cache Management

**Cache TTL**: 60 seconds
- Patient data doesn't change frequently during a session
- Balances freshness with performance

**Cache Invalidation**:
- URL change (user navigated to different patient)
- Page visibility change (user switched tabs/windows)
- Manual refresh via `refreshCache()`

**Debouncing**:
- Minimum 2 seconds between extraction attempts
- Prevents excessive background extraction

### Resource Management

**MediaStream Lifecycle**:
```
Extension Load → getUserMedia() → Mute → [Reuse] → Unmount → Stop
                                      ↑            ↓
                                  Recording ←→ Recording
```

**AudioContext Lifecycle**:
```
Extension Load → new AudioContext() → [Reuse Forever] → Unmount → Close
                                           ↑
                                    All Recordings
```

### Error Handling

**Patient Cache Failures**:
- Falls back to instant generated patient info
- Triggers background extraction for next recording
- Never blocks user workflow

**Audio Pre-warming Failures**:
- Silently degrades to normal flow
- Recording still works, just slightly slower
- Logs warnings for debugging

## Testing & Validation

### Console Logging

Look for these performance indicators:

```javascript
// Cache hit (ideal)
✅ Patient data cache hit (age: 9s)
✅ Patient data from cache in 0ms: Ms Rutnije Barolli

// Pre-warmed recording (ideal)
⚡ Using pre-warmed audio stream (instant start)
⚡ Reusing pre-warmed AudioContext
✅ Recording started in 52ms (pre-warmed: true)

// Cold start (first recording)
🔄 Getting new audio stream...
⏱️ Stream acquisition took 146ms
🔄 Creating new AudioContext
✅ Recording started in 203ms (pre-warmed: false)
```

### Performance Metrics

Monitor these timings in console:

1. **Cache lookup**: Should be <5ms
2. **Stream acquisition** (cold): ~150ms first time
3. **Stream reuse** (warm): ~0ms subsequent times
4. **Total recording start**: <200ms

### Cache Statistics

Debug cache status:
```javascript
patientCacheService.getCacheStats()
// Returns: { cached: true, valid: true, age: 12, hasData: true, ... }
```

## Files Modified

1. **New File**: `src/services/PatientDataCacheService.ts`
   - Background patient data extraction and caching

2. **Modified**: `src/hooks/useRecorder.ts`
   - Audio pipeline pre-warming
   - Stream/AudioContext reuse
   - Recording start latency logging

3. **Modified**: `src/sidepanel/OptimizedApp.tsx`
   - Integrated PatientDataCacheService
   - Background cache initialization
   - Cache-first patient data lookup

4. **Modified**: `src/sidepanel/components/results/OptimizedResultsPanel.tsx`
   - Fixed TypeScript types for Patient Education report

## Backward Compatibility

All changes are **fully backward compatible**:

- Graceful degradation if cache misses
- Falls back to original extraction if pre-warming fails
- No breaking changes to existing APIs
- Works with or without cached data

## Future Enhancements

### Potential Optimizations

1. **Smarter Cache Preloading**
   - Predict next patient based on EMR navigation
   - Pre-load patient list in batch

2. **Service Worker Integration**
   - Persist cache across extension reloads
   - Background sync for patient data

3. **Adaptive Pre-warming**
   - Only pre-warm if user likely to record (ML prediction)
   - Adjust timing based on usage patterns

4. **Memory Management**
   - Close AudioContext after inactivity period
   - Stop streams after configurable timeout

## Metrics & Monitoring

### Key Performance Indicators (KPIs)

1. **Recording Start Latency** (P50/P95/P99)
   - Target: <200ms median, <500ms 95th percentile

2. **Cache Hit Rate**
   - Target: >90% in active sessions

3. **Pre-warming Success Rate**
   - Target: >95% successful pre-warm

### Logging Strategy

- Minimal logging in production (reduce console spam)
- Detailed timing logs for performance debugging
- Cache statistics for monitoring hit rates

## Version History

- **v3.9.0** (2025-02-04): Recording latency optimizations
  - Background patient data caching
  - Audio pipeline pre-warming
  - 40-160x faster recording start

---

**Impact**: This optimization transforms the user experience from "waiting for the system" to "system is always ready". Recording starts feel instant and native, eliminating the primary UX friction point in the workflow.
