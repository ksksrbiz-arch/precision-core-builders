# Precision Core Builders: 48-Hour Critical Path Sprint (April 6-8, 2026)

**Objective:** Complete Phase 2 foundation tasks (Gantt chart + real-time updates) + Project Estimator UI to unlock 50% completion milestone.

**Team:** Claude (Agent)  
**Timeline:** 48 hours (April 6 evening → April 8 evening)  
**Environment:** Netlify Functions, Supabase Realtime, React 19 + Recharts

---

## SPRINT GOALS

### Primary Goals (Must Complete)

1. ✅ **Gantt Chart Component** — Fully functional task scheduling with drag-and-drop
2. ✅ **Real-Time Updates** — Subabase Realtime subscriptions in portal/admin pages
3. ✅ **Estimator UI Form** — Complete project estimator form with 3-tier results

### Secondary Goals (If Time Permits)

4. ⏳ **Field Report Publishing** — End-to-end voice → publish workflow
5. ⏳ **Client Portal Dashboard** — Real-time project timeline for clients

---

## CRITICAL PATH SCHEDULE

| Hour      | Task                       | Component                                 | Deliverable                    |
| --------- | -------------------------- | ----------------------------------------- | ------------------------------ |
| **0-2**   | Gantt Chart Setup          | Create component + recharts integration   | Renders empty chart            |
| **2-5**   | Gantt Chart Rendering      | Task bars, date ranges, dependencies      | Visual gantt display           |
| **5-8**   | Drag-and-Drop              | Implement reordering, save to DB          | Draggable tasks                |
| **8-10**  | Weather Highlighting       | Yellow background for rain tasks          | Weather-responsive display     |
| **10-12** | Gantt Testing & Commit     | E2E testing + bug fixes                   | Commit: feat: gantt-chart      |
| **12-14** | Realtime Hook              | Create useRealtimeSubscription            | Subscription logic             |
| **14-16** | Portal Integration         | Update PortalDashboard for real-time      | Live project updates           |
| **16-18** | Admin Integration          | Update CommandCenter for real-time        | Live dashboard metrics         |
| **18-20** | Field Reports Realtime     | Real-time new report appearance           | Instant publication            |
| **20-22** | Realtime Testing & Commit  | E2E across multiple tabs                  | Commit: feat: realtime-updates |
| **22-24** | Estimator Form             | Create form with all fields               | Input fields working           |
| **24-26** | Estimator API              | Integrate with /api/estimate-project      | API calls working              |
| **26-28** | Results Display            | Show 3-tier pricing + breakdown           | Results rendering              |
| **28-30** | Save Workflow              | Implement "Save Estimate"                 | Database persistence           |
| **30-32** | Mobile Responsive          | Test & fix mobile layout                  | Mobile working                 |
| **32-34** | Estimator Testing & Commit | E2E form → results → save                 | Commit: feat: estimator-form   |
| **34-40** | Verification & E2E         | Gantt test, Realtime test, Estimator test | All 3 features working         |
| **40-48** | Buffer & Optimization      | Bug fixes, performance, polish            | Production-ready code          |

---

## TASK BREAKDOWN

### TASK 1: Gantt Chart Component (Hours 0-12)

**Owner:** Claude | **Status:** Not Started | **Blocker:** Yes

**Deliverable Files:**

- `client/src/components/GanttChart.tsx` — Main component
- `client/src/pages/admin/ScheduleView.tsx` — Integration page

**Requirements:**

- [ ] Render schedule items as horizontal bars
- [ ] Date axis (X) and task axis (Y)
- [ ] Color-coded by status
- [ ] Yellow highlight for weather-dependent tasks
- [ ] Dependency lines between tasks
- [ ] Drag-and-drop task reordering
- [ ] On drop: call `scheduleRouter.updateOrder()`
- [ ] Real-time updates via Supabase Realtime

**Architecture:**

```typescript
interface GanttProps {
  projectId: number;
  tasks: ScheduleItem[];
  onTaskDragEnd: (taskId: number, newStartDate: Date) => void;
  weatherForecast: WeatherData;
}

// Use Recharts for chart
// Use react-beautiful-dnd for drag-and-drop
// Subscribe to schedule_items table for real-time updates
```

**Testing Checklist:**

- [ ] Gantt renders 5+ tasks without errors
- [ ] Task dates align with actual dates
- [ ] Dragging task reorders and saves
- [ ] Weather-dependent tasks show yellow
- [ ] Dependencies show as connecting lines
- [ ] Mobile responsive (tasks stack on small screens)
- [ ] No console errors

**Acceptance Criteria:**

- ✅ Gantt chart displays all tasks with correct dates
- ✅ Drag-and-drop saves changes to database
- ✅ Weather highlighting works
- ✅ Mobile responsive

---

### TASK 2: Real-Time Updates via Supabase Realtime (Hours 12-22)

**Owner:** Claude | **Status:** Not Started | **Blocker:** Yes

**Deliverable Files:**

- `client/src/_core/hooks/useRealtimeSubscription.ts` — Hook
- `client/src/pages/portal/PortalDashboard.tsx` — Integration
- `client/src/pages/admin/CommandCenter.tsx` — Integration
- `client/src/pages/admin/ScheduleView.tsx` — Integration

**Hook Signature:**

```typescript
function useRealtimeSubscription<T>(
  table: string,
  filter?: RealtimeFilterBuilder,
  callback?: (payload: RealtimePostgresChangesPayload<T>) => void
): { data: T[]; isSubscribed: boolean; error: Error | null };
```

**Integration Points:**

1. **PortalDashboard:** Subscribe to projects table
   - Update project status, budget, timeline
2. **CommandCenter:** Subscribe to projects + field_reports tables
   - Update dashboard metrics, lead count
3. **ScheduleView:** Subscribe to schedule_items table
   - Update Gantt chart on task changes
4. **FieldReportsList:** Subscribe to field_reports table
   - New reports appear instantly

**Testing Checklist:**

- [ ] Open 2 browser windows with same project
- [ ] Edit schedule in window 1
- [ ] Window 2 updates within <1 second
- [ ] Publish field report → portal updates
- [ ] No infinite loops (check subscription count)
- [ ] Handles connection loss gracefully
- [ ] Cleanup on unmount (no memory leaks)

**Acceptance Criteria:**

- ✅ Changes visible across all connected clients within <1s
- ✅ No memory leaks or infinite subscriptions
- ✅ Graceful error handling

---

### TASK 3: Project Estimator UI Form (Hours 22-34)

**Owner:** Claude | **Status:** Not Started | **Blocker:** Yes

**Deliverable Files:**

- `client/src/pages/Estimator.tsx` — Main form page
- `client/src/components/EstimatorResults.tsx` — Results display

**Form Fields:**

```typescript
{
  projectType: "New Home" | "Remodel" | "Addition" | "Repair" | "Custom";
  squareFootage?: number;
  complexity: "Basic" | "Standard" | "High-End";
  materials?: string[]; // e.g., ["premium hardwood", "marble counters"]
  location?: string; // default: Eugene, OR
  additionalNotes?: string;
}
```

**Form Validation:**

- [ ] Project type required
- [ ] Square footage numeric if provided
- [ ] Location defaults to "Eugene, OR"
- [ ] Error messages clear and actionable

**API Integration:**

- [ ] POST to `/api/estimate-project`
- [ ] Loading spinner while processing (<5s typical)
- [ ] Handle API errors gracefully
- [ ] Display results in modal or new section

**Results Display:**

```
┌─────────────────────────────────────┐
│ Your Project Estimate               │
├─────────────────────────────────────┤
│ Low Estimate:    $45,000            │
│ Mid Estimate:    $62,500            │
│ High Estimate:   $85,000            │
├─────────────────────────────────────┤
│ Breakdown:                          │
│ • Labor:        $25,000             │
│ • Materials:    $30,000             │
│ • Permits:      $2,500              │
│ • Contingency:  $5,000              │
├─────────────────────────────────────┤
│ "This estimate is based on Eugene   │
│ market rates for high-end finishes.  │
│ Final bid requires site visit."     │
└─────────────────────────────────────┘
```

**Save Workflow (For Authenticated Users):**

- [ ] "Save Estimate" button appears
- [ ] Call `estimatesRouter.create()`
- [ ] Save to database with 30-day expiration
- [ ] Show "Saved successfully" message
- [ ] Link to saved estimate (if logged in)

**Mobile Responsive:**

- [ ] Form stacks vertically on mobile
- [ ] Results readable on small screens
- [ ] CTA buttons touch-friendly
- [ ] No horizontal scrolling

**Testing Checklist:**

- [ ] Submit form with all fields → results in <5s
- [ ] Submit with missing fields → validation errors
- [ ] 3-tier pricing displays correctly
- [ ] Cost breakdown totals match overall
- [ ] Save estimate → appears in database
- [ ] Mobile layout works on 375px width
- [ ] No console errors

**Acceptance Criteria:**

- ✅ Form submits successfully
- ✅ API returns estimate within 5 seconds
- ✅ 3-tier results display with breakdown
- ✅ Authenticated users can save estimates
- ✅ Mobile friendly

---

## VERIFICATION CHECKLIST (End of Sprint)

### Code Quality

- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] `npm run build` completes in <12 seconds
- [ ] 0 ESLint warnings
- [ ] All new components fully typed
- [ ] JSDoc comments on all functions
- [ ] No `console.log` statements in production code

### Testing

- [ ] **Gantt:** Drag task → verify DB update within <1s
- [ ] **Gantt:** Weather highlighting visible for predicted rain
- [ ] **Realtime:** Edit project in 2 windows → both update instantly
- [ ] **Realtime:** Publish field report → portal shows instantly
- [ ] **Estimator:** Submit form → results in <5s
- [ ] **Estimator:** Save estimate → appears in admin list
- [ ] All features work on Chrome + Safari
- [ ] All features work on mobile (375px+)

### Performance

- [ ] Bundle size still <800KB gzip
- [ ] Lighthouse score >85
- [ ] First Contentful Paint <2.5s
- [ ] No memory leaks (DevTools)
- [ ] No excessive subscriptions (max 3 per page)

### Deployment

- [ ] All commits pushed to GitHub main
- [ ] Netlify auto-deploy succeeded
- [ ] Live site tested (precision-core.netlify.app)
- [ ] All 3 features working in production
- [ ] No console errors on production site
- [ ] HTTPS working

---

## GIT COMMIT PLAN

**Commit 1 (Hour ~12):**

```
feat: add GanttChart component with recharts

- Implement task bar rendering with date ranges
- Add drag-and-drop reordering via react-beautiful-dnd
- Highlight weather-dependent tasks in yellow
- Show dependencies as connecting lines
- Wire up to scheduleRouter for data
- Mobile responsive design
```

**Commit 2 (Hour ~22):**

```
feat: implement real-time updates via Supabase Realtime

- Create useRealtimeSubscription hook
- Integrate into PortalDashboard for live timeline
- Integrate into CommandCenter for live metrics
- Integrate into ScheduleView for live gantt
- Integrate into FieldReportsList for new reports
- Handle subscription cleanup on unmount
```

**Commit 3 (Hour ~34):**

```
feat: add project estimator form with 3-tier pricing

- Create Estimator.tsx page with full form
- Integrate with /api/estimate-project function
- Display 3-tier results with cost breakdown
- Implement "Save Estimate" for authenticated users
- Mobile responsive design
- Error handling and validation
```

**Commit 4 (Hour ~40+):**

```
chore: sprint completion - gantt, realtime, estimator ready

- E2E testing for all 3 features
- Performance optimization
- Mobile testing on actual device
- Production deployment verification
```

---

## RISK MITIGATION

| Risk                          | Probability | Impact | Mitigation                                               |
| ----------------------------- | ----------- | ------ | -------------------------------------------------------- |
| Recharts steep learning curve | Medium      | Medium | Use existing examples; simple horizontal bars sufficient |
| Drag-and-drop library bugs    | Low         | High   | Use `react-beautiful-dnd` (well-tested); test early      |
| Supabase Realtime limits      | Low         | Medium | Monitor subscription count; cleanup on unmount           |
| API timeouts                  | Low         | Medium | Add 10s timeout; retry logic for failed calls            |
| Mobile testing gaps           | High        | Medium | Test on actual device by hour 30                         |
| TypeScript compile errors     | Low         | Low    | Type-check frequently with `npm run build`               |

---

## ROLLBACK PLAN

If a feature cannot be completed by deadline:

1. **Gantt Chart:** Use static schedule table (still functional, no drag-and-drop)
2. **Real-Time:** Add manual refresh button (better UX than nothing)
3. **Estimator:** Show results without form save (test via cURL/Postman)

**Do NOT launch sprint if any feature breaks existing functionality.**

---

## SUCCESS METRICS (Post-Sprint)

| Metric                | Target      | Owner  | Status |
| --------------------- | ----------- | ------ | ------ |
| Build time            | <12s        | Claude | ⏳     |
| Bundle size           | <800KB gzip | Claude | ⏳     |
| TypeScript errors     | 0           | Claude | ⏳     |
| Gantt chart working   | 100%        | Claude | ⏳     |
| Real-time sync        | <1s         | Claude | ⏳     |
| Estimator form        | 100%        | Claude | ⏳     |
| Mobile responsive     | 100%        | Claude | ⏳     |
| Production deployment | Success     | Claude | ⏳     |

---

**Sprint Created:** April 6, 2026  
**Sprint Owner:** Claude (Agent)  
**Stakeholder:** Eric Tadlock (CCB #246527)  
**Last Updated:** April 6, 2026 @ 05:30 UTC
