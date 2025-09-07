# Processing Time Prediction System

## Overview

The Xestro Investigation Extension now includes an intelligent processing time prediction system that replaces static estimates with data-driven predictions based on transcription length, agent complexity, and historical performance data.

## Features

### ✅ Intelligent Time Estimates
- **Agent-Specific Baselines**: Each of the 11 medical agents has customized performance profiles
- **Length-Based Scaling**: Processing time adjusts based on transcription length
- **Historical Learning**: System improves predictions over time based on actual performance
- **Confidence Levels**: High/Medium/Low confidence with session count indicators

### ✅ Real-Time Display
- **Remaining Time Estimates**: Shows "~4s left" during processing
- **Confidence Indicators**: Visual badges showing prediction reliability
- **Dynamic Updates**: Estimates adjust in real-time as processing progresses

### ✅ Performance Learning
- **Automatic Data Collection**: Records actual processing times for learning
- **Chrome Storage Integration**: Historical data persists across sessions
- **Prediction Accuracy Tracking**: Monitors and reports prediction accuracy

## Agent Performance Profiles

### Lightweight Agents (Google Gemma-3n-e4b)
- **Investigation Summary**: 1.5s baseline, range: 1-3s
- **Medication**: 1.8s baseline, range: 1.2-3.5s  
- **Background**: 2s baseline, range: 1.5-4s

### Standard Agents (MedGemma-27b MLX)
- **Quick Letter**: 4s baseline, range: 2.5-8s
- **Consultation**: 5s baseline, range: 3-12s

### Heavy Agents (Complex MedGemma-27b)
- **TAVI**: 6s baseline, range: 4-15s
- **Angiogram/PCI**: 6.5s baseline, range: 4-15s
- **mTEER/tTEER**: 6s baseline, range: 4-14s
- **AI Medical Review**: 8s baseline, range: 5-20s

## Integration Guide

### Basic Usage

```typescript
import { ProcessingTimePredictor } from '@/services/ProcessingTimePredictor';

const predictor = ProcessingTimePredictor.getInstance();

// Generate prediction
const estimate = predictor.predictProcessingTime('tavi', 750);
console.log(estimate.displayText); // "Expected: 4-6s (High confidence, 15 sessions)"

// Record actual time for learning
predictor.recordActualProcessingTime('tavi', 750, 5200);
```

### Hook Usage

```typescript
import { useProcessingTimePredictor } from '@/hooks/useProcessingTimePredictor';

const { prediction, generatePrediction, recordActualTime } = useProcessingTimePredictor();

// Generate prediction
generatePrediction('investigation-summary', 450);

// Record result
recordActualTime('investigation-summary', 450, 1800);
```

### Component Integration

```typescript
<ProcessingPhaseIndicator
  currentProgress={progress}
  isActive={true}
  agentType="tavi"
  transcriptionLength={transcription.length}
  showTimeEstimate={true}
  onProcessingComplete={(actualTime) => {
    console.log(`Completed in ${actualTime}ms`);
  }}
/>
```

## Data Structure

### ProcessingTimeEstimate
```typescript
interface ProcessingTimeEstimate {
  estimatedDurationMs: number;        // 4500
  confidenceLevel: 'high' | 'medium' | 'low';
  factors: EstimationFactor[];        // What influenced the estimate
  range: { min: number; max: number }; // { min: 3600, max: 5400 }
  basedOnSessions: number;            // 15
  displayText: string;                // "Expected: 4-6s (High confidence)"
}
```

### EstimationFactor
```typescript
interface EstimationFactor {
  name: string;                       // "Agent baseline"
  impact: number;                     // 1.2 (multiplier) or 1500 (additive ms)
  description: string;                // "Heavy model baseline"
  type: 'multiplier' | 'additive';
}
```

## Algorithm Details

### 1. Base Calculation
```
baseTime = agentProfile.baselineMs
lengthFactor = 1 + (ln(length/500 + 1) * scalingFactor * 0.3)
```

### 2. Historical Adjustment
- Analyzes last 20 sessions for the agent
- Finds similar transcription lengths (±50%)
- Calculates performance ratio vs baseline
- Applies bounded adjustment (0.5x to 2x)

### 3. System Performance Factor
- Monitors recent performance issues
- Adjusts for current system load
- Ranges from 0.8x (fast) to 2.0x (slow)

### 4. Confidence Calculation
- **High**: ≥20 historical sessions
- **Medium**: 8-19 historical sessions  
- **Low**: <8 historical sessions

## Storage and Persistence

### Chrome Extension Storage
- Stores up to 200 historical data points
- Automatically persists across extension restarts
- Lightweight JSON format for efficient storage

### Data Privacy
- All processing occurs locally
- No data transmitted to external servers
- Can be cleared via `predictor.clearHistoricalData()`

## Performance Monitoring

### Accuracy Tracking
```typescript
const accuracy = predictor.updatePredictionAccuracy(prediction, actualTime);
console.log(`Prediction accuracy: ${accuracy.accuracy * 100}%`);
console.log(`Within range: ${accuracy.wasWithinRange}`);
```

### Agent Performance Stats
```typescript
const stats = predictor.getAgentPerformanceStats('tavi');
// { averageTime: 5200, sessionCount: 15, accuracyTrend: 'improving' }
```

## UI Display Examples

### During Processing
- **Header**: Shows remaining time estimate with confidence
- **Progress Bar**: Standard completion percentage
- **Footer**: Full prediction details with confidence badge

### Display Formats
- `"Expected: 4-6s (High confidence, 15 sessions)"`
- `"~3s left"` (remaining time during processing)
- `"Medium confidence"` (confidence badge)

## Future Enhancements

### Planned Features
1. **Advanced Learning**: Machine learning for better accuracy
2. **System Performance Integration**: CPU/memory usage correlation
3. **User Personalization**: Individual performance patterns
4. **Batch Processing Predictions**: Multi-patient workflow estimates
5. **Performance Insights Dashboard**: Historical trends and optimization suggestions

## Troubleshooting

### Common Issues
1. **No predictions showing**: Check `showTimeEstimate={true}` prop
2. **Inaccurate estimates**: Need more historical data (minimum 8 sessions)
3. **Storage errors**: Check Chrome extension permissions

### Debug Logging
```typescript
// Enable detailed logging
console.log('Prediction generated:', prediction);
console.log('Historical data:', predictor.exportHistoricalData());
```

## Impact on User Experience

### Before
- Static estimates: "Expected: 10.0s - 30.0s (low complexity)"
- No real-time feedback
- User uncertainty during processing

### After  
- Dynamic estimates: "Expected: 4-6s (High confidence, 15 sessions)"
- Real-time remaining time: "~3s left"
- Confidence indicators reduce anxiety
- System learns and improves over time

This intelligent prediction system significantly enhances user experience by providing accurate, confidence-weighted time estimates that improve through usage, replacing generic static estimates with personalized, data-driven predictions.