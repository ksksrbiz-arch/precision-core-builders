# Precision Core Builders: 48-Hour Implementation Sprint

**Objective:** Build and deploy core "Digital Foreman" features to enable Phase 1-2 functionality.

**Team:** Claude Max (Agentic Implementation)  
**Timeline:** 48 hours  
**Environment:** Netlify-native, Supabase backend, tRPC API  

---

## Hour Allocation

| Phase | Task | Hours | Status |
|-------|------|-------|--------|
| **0-4h** | Landing Page Polish + Project Setup | 4h | ⏳ NEXT |
| **4-10h** | Voice Recorder Component + Field Report UI | 6h | ⏳ QUEUED |
| **10-16h** | Implement `estimate-project` Netlify Function | 6h | ⏳ QUEUED |
| **16-22h** | Implement `weather-schedule` Netlify Function | 6h | ⏳ QUEUED |
| **22-28h** | Build GanttChart + ScheduleView | 6h | ⏳ QUEUED |
| **28-32h** | Material Procurement UI + Skeleton | 4h | ⏳ QUEUED |
| **32-36h** | Testing + Deployment Prep | 4h | ⏳ QUEUED |
| **36-48h** | Buffer + Final Polish | 12h | ⏳ QUEUED |

---

## TASK GROUP 1: Landing Page Polish (Hours 0-4)

### Task 1.1: Create Hero Section Component
**File:** `client/src/components/HeroSection.tsx`  
**Requirements:**
- Full-bleed cinematic video background or gradient overlay
- "Quiet Luxury" aesthetic with warm colors (beige, bronze tones)
- Main headline: "Precision Construction. Core Values."
- Subheading: "Enterprise construction management for serious builders"
- CTA buttons: "Schedule Consultation" + "View Portfolio"
- CCB #246527 certification badge
- Responsive mobile-first design

**Acceptance Criteria:**
- [ ] Video/gradient loads without layout shift
- [ ] CTA buttons route correctly
- [ ] Mobile: stacked buttons, readable at 320px+
- [ ] Lighthouse score: 85+

### Task 1.2: Polish Home.tsx Landing Page
**File:** `client/src/pages/Home.tsx`  
**Requirements:**
- Import HeroSection
- Add "Digital Foreman Features" section (4 cards):
  1. Voice Field Reports - "5-minute daily reports"
  2. Smart Scheduling - "Weather-responsive task management"
  3. Budget Intelligence - "Real-time cost tracking"
  4. Client Transparency - "Live project portal"
- Add testimonial section with placeholder quotes
- Add FAQ section (3-5 items)
- Add footer CTA

**Acceptance Criteria:**
- [ ] All sections visible, properly spaced
- [ ] Images load from `client/public/images/`
- [ ] No console errors
- [ ] Passes accessibility audit

### Task 1.3: Create Asset Placeholders
**Directory:** `client/public/images/`  
**Files to create:**
- `hero-background.webp` (cinematic landscape construction site)
- `feature-voice.svg` (microphone icon)
- `feature-weather.svg` (cloud + sun icon)
- `feature-budget.svg` (dollar chart icon)
- `feature-portal.svg` (eye icon)
- `testimonial-placeholder.jpg` (generic headshot)

**Acceptance Criteria:**
- [ ] All files optimized for web (<500KB each)
- [ ] SVGs use brand colors
- [ ] No broken image links in Home.tsx

---

## TASK GROUP 2: Voice Recorder Component (Hours 4-8)

### Task 2.1: Create VoiceRecorder Component
**File:** `client/src/components/VoiceRecorder.tsx`  
**Requirements:**
- Use Web Audio API for recording
- Visual waveform during recording
- Record button (red circle) → Stop button
- Upload status indicator
- Error handling for permissions

**Props:**
```typescript
interface VoiceRecorderProps {
  projectId: number;
  onSuccess?: (reportId: number) => void;
  onError?: (error: string) => void;
}
```

**Acceptance Criteria:**
- [ ] Records audio to 30+ seconds
- [ ] Displays duration counter
- [ ] Graceful fallback if microphone unavailable
- [ ] Shows upload progress
- [ ] Displays server response (report ID)

### Task 2.2: Build FieldReportNew Page
**File:** `client/src/pages/admin/FieldReportNew.tsx`  
**Requirements:**
- Project selector dropdown
- VoiceRecorder component
- Preview of transcription (auto-filled after upload)
- Manual edit fields:
  - Summary (textarea)
  - Tasks Completed (tag input)
  - Materials Used (tag input)
  - Issues Flagged (tag input)
- "Publish to Client Portal" checkbox
- Save + Publish buttons

**Acceptance Criteria:**
- [ ] Form validates before submit
- [ ] Project selector works
- [ ] Audio uploads and transcription displays
- [ ] Edit fields update in real-time
- [ ] Publish toggles notification

### Task 2.3: Integrate Voice-to-Report Netlify Function
**File:** `client/src/lib/voiceToReport.ts`  
**Requirements:**
- Function to call `/api/voice-to-report` with audio blob
- Auto-extract JSON response
- Handle errors with user-friendly messages
- Return: `{ reportId, transcription, summary, tasksCompleted, ... }`

**Acceptance Criteria:**
- [ ] Successfully uploads audio
- [ ] Transcription returns within 15s
- [ ] JSON parsing succeeds
- [ ] Error messages are clear

---

## TASK GROUP 3: Estimate Project Netlify Function (Hours 10-16)

### Task 3.1: Implement `estimate-project` Netlify Function
**File:** `netlify/functions/estimate-project.ts`  
**Requirements:**
- Endpoint: `POST /api/estimate-project`
- Input validation with Zod
- Claude API call with specialized estimator prompt
- Structured response (3-tier estimate: low/mid/high)
- Database save to `estimates` table
- Return estimate ID + breakdown

**Input Schema:**
```typescript
{
  projectType: "new_build" | "remodel" | "addition" | "repair",
  squareFootage: number,
  complexity: "low" | "medium" | "high",
  location: string, // Eugene, OR
  materials?: string[], // e.g., ["granite", "hardwood"]
  clientId?: number,
  additionalNotes?: string
}
```

**Output Response:**
```typescript
{
  estimateId: number,
  estimatedLow: number,
  estimatedMid: number,
  estimatedHigh: number,
  breakdown: {
    labor: number,
    materials: number,
    permits: number,
    contingency: number,
  },
  reasoning: string // Why this price range
}
```

**Acceptance Criteria:**
- [ ] Validates input with Zod
- [ ] Claude returns valid JSON
- [ ] Database insert succeeds
- [ ] Response time < 10s
- [ ] Error handling for API failures

### Task 3.2: Create ProjectEstimator Component
**File:** `client/src/components/ProjectEstimator.tsx`  
**Requirements:**
- Form inputs for estimate parameters
- Real-time calculation (debounced)
- Results display with 3-tier pricing
- Breakdown visualization (recharts pie chart)
- "Request Full Estimate" CTA → saves to DB

**Acceptance Criteria:**
- [ ] All form fields functional
- [ ] Results update on parameter change
- [ ] Charts render correctly
- [ ] Save to DB works
- [ ] Mobile responsive

---

## TASK GROUP 4: Weather Schedule Netlify Function (Hours 16-22)

### Task 4.1: Implement `weather-schedule` Netlify Function
**File:** `netlify/functions/weather-schedule.ts`  
**Requirements:**
- Endpoint: `POST /api/weather-schedule`
- Input: projectId, next 7-day forecast
- Call OpenWeatherMap API for Eugene, OR weather
- Identify rain/adverse weather days
- Auto-reorder Gantt tasks:
  - Defer outdoor tasks on rain days
  - Promote indoor tasks
  - Preserve dependencies
- Return updated schedule

**Input Schema:**
```typescript
{
  projectId: number
}
```

**Output Response:**
```typescript
{
  projectId: number,
  forecast: [
    {
      date: string,
      condition: "clear" | "cloudy" | "rainy" | "stormy",
      tempHigh: number,
      tempLow: number,
      windSpeed: number
    }
  ],
  adjustments: [
    {
      taskId: number,
      from: string, // original date
      to: string, // new date
      reason: string
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Calls OpenWeatherMap API successfully
- [ ] Identifies adverse weather (rain > 40% chance)
- [ ] Task reordering respects dependencies
- [ ] Database updates schedule_items table
- [ ] Response time < 5s

### Task 4.2: Create Weather Integration in ScheduleView
**File:** `client/src/pages/admin/ScheduleView.tsx` (update)  
**Requirements:**
- Display weather forecast for project location
- Show which tasks are affected
- "Apply Weather Adjustments" button
- Visual indication of weather-sensitive tasks (cloud icon)
- Undo button if adjustments made

**Acceptance Criteria:**
- [ ] Weather forecast displays correctly
- [ ] Tasks highlight based on weather
- [ ] "Apply" button works
- [ ] Schedule updates in real-time

---

## TASK GROUP 5: Gantt Chart Component (Hours 22-28)

### Task 5.1: Build GanttChart Component
**File:** `client/src/components/GanttChart.tsx`  
**Requirements:**
- Use Recharts or custom SVG for rendering
- Task bars with start/end dates
- Drag-and-drop to reorder (within constraints)
- Dependency lines between tasks
- Color-coded by task type (outdoor, indoor, etc.)
- Legend showing status colors
- Responsive to schedule item updates

**Acceptance Criteria:**
- [ ] Renders 20+ tasks without lag
- [ ] Drag-and-drop functional
- [ ] Dependency visualization clear
- [ ] Mobile: scrollable table view fallback
- [ ] Updates when schedule changes

### Task 5.2: Build ScheduleView Admin Page
**File:** `client/src/pages/admin/ScheduleView.tsx`  
**Requirements:**
- Project selector
- GanttChart display
- Weather forecast integration
- Task details panel (click task to edit)
- Quick-add task form
- Export to CSV button

**Acceptance Criteria:**
- [ ] GanttChart loads with project data
- [ ] Weather forecast visible
- [ ] Task creation works
- [ ] All tRPC calls succeed
- [ ] No console errors

---

## TASK GROUP 6: Material Procurement Skeleton (Hours 28-32)

### Task 6.1: Create MaterialProcurementUI Component
**File:** `client/src/components/MaterialProcurementUI.tsx`  
**Requirements:**
- Material list table (name, quantity, unit, cost, vendor)
- Search/filter by category
- Add material form
- Edit/delete actions
- Show material shortages (red highlight)
- Export PO button

**Acceptance Criteria:**
- [ ] Table displays materials
- [ ] CRUD operations work
- [ ] Shortages highlighted
- [ ] Export generates CSV
- [ ] Mobile: scrollable table

### Task 6.2: Update MaterialsView Page
**File:** `client/src/pages/admin/MaterialsView.tsx`  
**Requirements:**
- MaterialProcurementUI component
- Project selector
- Phase tracking (foundation, framing, etc.)
- Budget impact summary
- Vendor comparison sidebar

**Acceptance Criteria:**
- [ ] Materials load for project
- [ ] UI responsive
- [ ] All buttons functional
- [ ] Phase filtering works

---

## TASK GROUP 7: Testing & Deployment (Hours 32-40)

### Task 7.1: Test All Components
**Checklist:**
- [ ] Voice Recorder captures audio correctly
- [ ] Field Report upload successful
- [ ] Estimate calculations accurate (3-5 test cases)
- [ ] Weather integration fetches forecast
- [ ] Schedule reordering preserves dependencies
- [ ] Gantt chart renders performance acceptable
- [ ] Mobile responsive on iPhone 12, Android
- [ ] No console errors or warnings

### Task 7.2: Test Netlify Functions Locally
**Checklist:**
- [ ] `voice-to-report` function works end-to-end
- [ ] `estimate-project` returns correct format
- [ ] `weather-schedule` API calls succeed
- [ ] All error paths handled
- [ ] CORS headers present
- [ ] Response times acceptable

### Task 7.3: Prepare Deployment
**Checklist:**
- [ ] All env vars configured in Netlify dashboard
- [ ] Database migrations run
- [ ] Git branch created for this sprint
- [ ] All changes committed
- [ ] Build succeeds: `npm run build`

---

## TASK GROUP 8: Buffer & Polish (Hours 40-48)

### Task 8.1: Performance Optimization
- [ ] Reduce bundle size: code-split large components
- [ ] Lazy load images on landing page
- [ ] Optimize Recharts (use memoization)
- [ ] Cache API responses where appropriate
- [ ] Lighthouse score: 85+

### Task 8.2: Final Polish
- [ ] All buttons have proper hover states
- [ ] Loading spinners present (Framer Motion)
- [ ] Error messages are user-friendly
- [ ] Form validation messages clear
- [ ] Accessibility: all images have alt text
- [ ] Documentation: README updated

### Task 8.3: Smoke Tests
- [ ] Fresh deploy on Netlify
- [ ] Test all critical flows:
  1. Create project → Record voice memo → Publish report
  2. Get estimate → Save estimate → View in portal
  3. Check weather → Auto-adjust schedule
- [ ] Check error handling (missing env vars, bad requests)
- [ ] Verify mobile experience

---

## Environment Variables Required

Place these in Netlify dashboard under **Site Settings → Build & Deploy → Environment**:

```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_ROLE_KEY=[service role key]
DATABASE_URL=postgresql://user:password@localhost/db
OPENAI_API_KEY=[sk-svcacct-...]
OPENWEATHERMAP_API_KEY=508c97eabd85590db5f372f6bdc8c828
ANTHROPIC_API_KEY=[sk-ant-admin01-...]
VITE_NETLIFY_AUTH_DOMAIN=[domain]
STRIPE_SECRET_KEY=[sk_live_...]
N8N_WEBHOOK_URL=[webhook url]
```

---

## Dependencies Already Available

✅ Installed and ready:
- React 19 + Vite 8
- tRPC 11 + React Query 5
- Tailwind CSS 4
- Framer Motion
- Recharts
- Zod
- Supabase JS SDK
- Anthropic SDK
- @netlify/functions

---

## Success Metrics (End of Sprint)

| Metric | Target | Pass/Fail |
|--------|--------|-----------|
| **Voice-to-Report** | Record → Transcribe → Publish < 20s | ⏳ TBD |
| **Estimate** | Calculate 3-tier price < 10s | ⏳ TBD |
| **Weather Integration** | Fetch forecast + reorder < 5s | ⏳ TBD |
| **Gantt Rendering** | 50 tasks @ 60fps | ⏳ TBD |
| **Landing Page** | Lighthouse 85+ | ⏳ TBD |
| **Build Time** | < 15s | ⏳ TBD |
| **Bundle Size** | < 1.2MB (gzip) | ⏳ TBD |
| **Deployment** | GitHub → Netlify < 3min | ⏳ TBD |

---

## Implementation Notes

### Architecture Decisions
- Use **Claude (not Gemini)** for all AI calls → faster, cheaper, more reliable
- Use **Supabase PostgreSQL** for all data → simplifies infrastructure
- Use **Recharts** for visualizations → lightweight, React-first
- Use **Web Audio API** for voice recording → no external dependencies
- Store audio in **Supabase Storage** → automatic encryption + CDN

### Error Handling Pattern
All Netlify Functions follow this pattern:
```typescript
try {
  // Validate input
  // Call external APIs
  // Save to database
  // Return { statusCode: 200, body: JSON.stringify(result) }
} catch (err) {
  console.error(err);
  return {
    statusCode: err.statusCode || 500,
    body: JSON.stringify({ error: err.message })
  };
}
```

### Performance Targets
- Voice-to-report latency: Whisper (5-10s) + Claude (3-5s) = 10-15s total
- Estimate calculation: Claude (3-5s)
- Weather fetch: OpenWeatherMap (1-2s)
- Gantt rendering: <300ms for 50 tasks

---

## Git Workflow
```bash
# Create feature branch
git checkout -b feat/voice-estimator-weather-v1

# After each task group, commit
git add .
git commit -m "feat: implement voice recorder + field report UI"

# Before deployment, squash commits
git rebase -i main

# Push to trigger Netlify deploy
git push origin feat/voice-estimator-weather-v1

# Create PR for code review (if applicable)
```

---

**Next Step:** Begin TASK GROUP 1 (Landing Page Polish)
