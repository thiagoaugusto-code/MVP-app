# AI Chat Service - Integration Documentation

## Overview

The AI Chat Service (`aiChatService.js`) provides intelligent, context-aware meal and fitness suggestions using **OpenAI GPT-4** with fallback support for Claude.

## Architecture

### Real-time Flow
```
User Input
    ↓
Smart Context (7 days: meals, workouts, streaks, goals)
    ↓
System Prompt (mode-specific: coach, preventive, celebration, welcoming)
    ↓
OpenAI API Call (with retry + timeout)
    ↓
Response Stored + Metrics Updated
    ↓
Socket.io Emit to Frontend
    ↓
Notification Trigger (if contextual)
```

### Key Features

#### 1. Smart Context Window
- **7-day history**: Recent meals, workouts, daily checks
- **User profile**: Goal (weight loss/gain), current/target weight, height
- **Streak tracking**: Consistency metrics
- **Budget awareness**: Financial constraints

#### 2. Conversation Modes
- **coach**: Direct, motivational, results-focused
- **preventive**: Gentle alerts about gaps/risks
- **celebration**: Enthusiastic acknowledgment of wins
- **welcoming**: Supportive, confidence-building

#### 3. Intelligent Caching
- **30-minute TTL** by default (configurable: `AI_CACHE_DURATION`)
- **Similarity matching**: Suggestion queries cached for re-use
- **Debounce**: 5-second minimum between API calls per user

#### 4. Resilience
- **Exponential backoff retry**: Up to 2 retries with 1s/2s wait
- **Timeout protection**: 30-second default (configurable: `AI_API_TIMEOUT`)
- **Graceful fallback**: Safe local responses if API unavailable
- **Daily token budget**: 50,000 tokens/day limit per user

## Configuration

### Required Environment Variables

```bash
# .env (backend only - never expose to frontend)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-4-turbo
AI_API_TIMEOUT=30000  # milliseconds
AI_DAILY_TOKEN_LIMIT=50000
```

### Optional Customization

```bash
AI_CACHE_DURATION=3600000  # 1 hour in ms
AI_DEBOUNCE_MS=5000        # 5 seconds
```

## API Usage

### Generate Contextual Response

```javascript
const aiService = require('./src/services/aiChatService');

// Single response
const response = await aiService.generateResponse(
  userId,
  'coach',  // mode
  'Completei meu treino'
);

// Response structure:
{
  text: "Excelente! Agora hidrate-se...",
  tokensUsed: 142,
  cost: 0.000284,  // OpenAI pricing
  provider: 'openai',
  success: true,
  cached: false,
  fallback: false
}
```

### Get User Context

```javascript
const context = await aiService.getUserContext(userId, 7);
// Returns: { profile, recentMeals, recentChecks, currentStreak }
```

### Suggest Meals by Budget

```javascript
const suggestion = await aiService.suggestMealsByBudget(
  userId,
  budgetPerDay,
  targetCalories
);
```

## Logging

All API calls are logged with structured metadata:

```
✅ AI API call successful (gpt-4-turbo): {
  tokensUsed: 142,
  promptLength: 256,
  attempt: 1
}

⚠️ AI API call failed (attempt 1/3): {
  error: "Connection timeout",
  status: null
}

⏳ Retrying AI API in 1000ms...
```

## Error Handling

| Error | Behavior |
|-------|----------|
| Missing API Key | Throw error, use fallback |
| Network timeout | Retry with backoff |
| Auth error (401/403) | Throw immediately, no retry |
| Rate limit (429) | Retry with exponential backoff |
| Daily token limit exceeded | Return canned response |
| Debounce active | Return "wait" message |

## Testing

### Unit Tests (Mocked)
```bash
npm test -- tests/aiChatService.test.js
```

### Integration Tests (Real API)
```bash
# Requires valid OPENAI_API_KEY in .env
node src/services/aiChatService.test-integration.js
```

## Database Storage

All AI chat interactions are stored in `AIChat` table:

| Field | Purpose |
|-------|---------|
| userId | User reference |
| mode | Conversation mode |
| prompt | User's input |
| response | AI's output |
| tokensUsed | OpenAI token count |
| cost | Calculated cost ($) |
| cached | Whether response was cached |
| createdAt | Timestamp |

Chat metrics tracked in `ChatMetrics` table:
- `dailyTokens`: Tokens used today
- `totalCost`: Cumulative cost
- `dailyTokensDate`: Reset date

## Performance Targets

- **API response time**: <3s (with retries)
- **Cache hit rate**: >40% for suggestions
- **Fallback success**: 100%
- **Error recovery**: <15 seconds total

## Future Enhancements

- [ ] Claude 3.5 full integration
- [ ] Multi-turn conversation memory
- [ ] Personalized tone learning
- [ ] Cost breakdown dashboard
- [ ] A/B testing different modes
- [ ] Real-time token usage streaming

## Troubleshooting

### API calls failing
1. Verify `OPENAI_API_KEY` is valid
2. Check account has credits
3. Verify `OPENAI_MODEL` exists
4. Check network connectivity

### High token usage
1. Review context window (7 days)
2. Check for duplicate meal logging
3. Reduce prompt verbosity
4. Implement stricter cache

### Cached responses stale
1. Reduce `AI_CACHE_DURATION`
2. Clear cache on major changes
3. Implement cache invalidation logic

## Security Notes

- 🔒 **Never** expose API key in frontend
- 🔒 **Never** log full API responses (PII risk)
- 🔒 Backend-only service layer
- 🔒 Rate limit per user (50k tokens/day)
- 🔒 Cost tracking per interaction
