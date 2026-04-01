# Netlify Functions (Serverless Backend)

This directory contains serverless functions that run on Netlify's edge network. These functions replace traditional backend server routes and provide scalable, serverless compute for the Precision Core Builders platform.

## Overview

All backend logic runs as Netlify Functions, providing:
- Automatic scaling
- Pay-per-use pricing
- Edge deployment
- Zero server management

## Required Functions (Per CLAUDE.md)

The following serverless functions need to be implemented:

### 1. Voice-to-Report (`voice-to-report.ts`)
Accepts audio file, transcribes with Whisper, generates field report with Gemini.

**Endpoint:** `POST /api/voice-to-report`

**Request:**
```typescript
{
  audio: File | Blob,
  projectId: string
}
```

**Response:**
```typescript
{
  transcription: string,
  report: {
    summary: string,
    date: string,
    tasks: string[],
    materials: string[],
    issues: string[]
  }
}
```

### 2. Project Estimator (`estimate-project.ts`)
Calculates real-time cost ranges based on project parameters.

**Endpoint:** `POST /api/estimate-project`

**Request:**
```typescript
{
  squareFootage: number,
  projectType: string,
  materials: string[],
  complexity: 'low' | 'medium' | 'high'
}
```

**Response:**
```typescript
{
  estimatedCost: {
    low: number,
    mid: number,
    high: number
  },
  breakdown: {
    labor: number,
    materials: number,
    permits: number,
    contingency: number
  }
}
```

### 3. Weather Schedule (`weather-schedule.ts`)
Fetches Eugene, OR weather and adjusts Gantt chart priorities.

**Endpoint:** `GET /api/weather-schedule`

**Query Params:**
- `projectId`: string

**Response:**
```typescript
{
  weather: {
    date: string,
    rainProbability: number,
    temperature: number
  }[],
  adjustedSchedule: {
    taskId: string,
    newPriority: number,
    reason: string
  }[]
}
```

### 4. Material Procurement (`material-procurement.ts`)
Monitors project phases, drafts POs, checks vendor pricing.

**Endpoint:** `POST /api/material-procurement`

**Request:**
```typescript
{
  projectId: string,
  phase: string
}
```

**Response:**
```typescript
{
  purchaseOrders: {
    id: string,
    vendor: string,
    items: { name: string, quantity: number, price: number }[],
    total: number
  }[],
  alternatives: {
    item: string,
    currentVendor: string,
    alternativeVendor: string,
    savings: number
  }[]
}
```

### 5. Lead Scoring (`lead-score.ts`)
AI-prioritizes incoming leads by project type, budget, location.

**Endpoint:** `POST /api/lead-score`

**Request:**
```typescript
{
  lead: {
    name: string,
    email: string,
    phone: string,
    projectType: string,
    budget: number,
    location: string,
    description: string
  }
}
```

**Response:**
```typescript
{
  score: number, // 0-100
  priority: 'low' | 'medium' | 'high',
  reasoning: string,
  suggestedAction: string
}
```

## Creating a New Function

1. Create a new TypeScript file in this directory (e.g., `my-function.ts`)

2. Export a handler function:

```typescript
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Your function logic here
    const result = await doSomething(body);

    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

3. The function will be automatically available at `/api/[function-name]`

## Environment Variables

All functions have access to environment variables set in Netlify dashboard:
- `GEMINI_API_KEY`
- `WHISPER_API_KEY`
- `OPENWEATHERMAP_API_KEY`
- `N8N_WEBHOOK_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- etc.

Access them via `process.env.VARIABLE_NAME`

## Testing Locally

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Link to your Netlify site:
   ```bash
   netlify link
   ```

3. Run dev server with functions:
   ```bash
   netlify dev
   ```

4. Test your function:
   ```bash
   curl -X POST http://localhost:8888/api/my-function \
     -H "Content-Type: application/json" \
     -d '{"key": "value"}'
   ```

## Best Practices

1. **Keep functions small and focused** - One function = one responsibility
2. **Use environment variables for secrets** - Never hardcode API keys
3. **Implement proper error handling** - Return meaningful error messages
4. **Add input validation** - Use Zod for request body validation
5. **Log important events** - Use `console.log` for debugging
6. **Set appropriate timeouts** - Functions timeout after 10s by default
7. **Handle CORS** - Include proper CORS headers if needed

## Deployment

Functions are automatically deployed when you push to GitHub:

1. Push code to GitHub
2. Netlify automatically builds and deploys
3. Functions are live at `https://your-site.netlify.app/api/function-name`

## Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Functions Examples](https://functions.netlify.com/examples/)
- [TypeScript with Netlify Functions](https://docs.netlify.com/functions/build-with-typescript/)
