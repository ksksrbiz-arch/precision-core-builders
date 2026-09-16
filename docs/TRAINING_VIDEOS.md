# Walkthrough Videos — Recording & Publishing

Eric wants to use every feature; he just needs to be shown how. The written
guides already cover the steps — these videos exist so he can _watch_ it
happen once, then fall back on the text.

Keep them short. A two-minute video that gets watched beats a twelve-minute
one that doesn't.

---

## How to publish a video

1. Record the screen (phone, Loom, OBS — doesn't matter).
2. Upload to YouTube as **Unlisted**.
   - **Unlisted**, not Private. Private videos cannot be embedded and will
     show "Video unavailable" inside the platform.
   - Unlisted means: not in search, not on the channel, anyone with the link
     can watch. That's the right setting for client-adjacent training.
3. Copy the video ID — the part after `youtu.be/` in the share link.
4. Add one line to `client/src/lib/guide-videos.ts`:

   ```ts
   export const GUIDE_VIDEOS: Record<string, GuideVideo> = {
     "field-reports": { youtubeId: "dQw4w9WgXcQ", duration: "3 min" },
   };
   ```

5. Commit and push. Netlify deploys it.

That's the whole process. No other file changes, no environment variables.

### Where the video shows up

Adding one entry puts the video in three places at once:

- The **guide card** on `/admin/guides`
- The **contextual help sheet** behind the `?` icon in the header of the
  matching admin screen
- The matching lesson in **First Week Training** (`/admin/training`)

Guides with no entry simply show no video. The written steps always stand on
their own — a missing video never leaves a hole in the page.

### How playback behaves

The player is click-to-play: nothing loads from YouTube until the play button
is pressed. On a bad connection that costs a still thumbnail instead of a
stalled embed, and there's an "Open on YouTube" link under the player for when
the embed itself is blocked.

Embeds use `youtube-nocookie.com`, which is the only YouTube host permitted by
the `frame-src` directive in `netlify.toml`. If you ever switch hosts, that
header has to change too or the video will silently fail to load.

---

## Recording scripts

Each script is a shot list, not a word-for-word read. Talk like you're
standing next to him.

### 1. `command-center` — "Your morning dashboard" (~2 min)

- Open `/admin` cold, as if it's 6am.
- Point at each of the four KPI cards and say in one sentence what it tells
  you and what a bad number looks like.
- Scroll to the latest field reports. "This is how you know what happened
  yesterday without calling anybody."
- End on the `?` icon in the header. **Say explicitly: this icon is on every
  screen and it explains the screen you're on.** That one habit makes the
  rest of the videos optional.

### 2. `projects` — "Set up a real job" (~3 min)

- Add a client. Call out that the email is their portal login.
- Create a project, attach the client, set budget and dates.
- Say why the budget matters: every profitability number later is measured
  against it.

### 3. `field-reports` — "Talk instead of typing" (~3 min)

This is the one that sells the whole platform. Record it on an actual site if
you can — wind and noise in the background makes the point.

- Pick the project, hit the red button, talk for 45 seconds about real work.
- Stop. Let the transcription and summary land on camera — don't cut it.
- Open the client portal side by side and show the same report there.
- Close with the time comparison: 30 minutes of writing versus 90 seconds of
  talking.

### 4. `schedule` — "Drag the timeline" (~2 min)

- Show the Gantt with a real job on it.
- Drag one task to a different week. Point out that it saved on drop — no
  save button.
- Show a weather-sensitive task and explain what happens when rain shows up
  in the forecast.

### 5. `materials` — "Never get caught short" (~2 min)

- Add a couple of materials with quantities and a vendor.
- Drop one on-hand count below what's needed; the shortage flags itself.
- Generate the purchase order and show the vendor grouping.

### 6. `estimates` — "Three numbers, same day" (~3 min)

- Generate an estimate from project details.
- Show the three tiers and the category breakdown.
- Edit one line to make the point that the AI number is a starting point and
  the margins are his.

### 7. `billing` — "Get paid" (~2 min)

- Create a milestone invoice, send it.
- Show the client's payment view.
- Explain that Stripe reconciles the payment against the ledger by itself —
  nothing gets marked paid by hand.

### 8. `notifications` — "How it reaches you" (~90 sec)

- Walk the channel options: in-app, email, text.
- Recommend text only for things that stop work, email for the rest.

### 9. `search` — "Find anything" (~90 sec)

- Search a client name.
- Then search a phrase spoken in a voice report, to show his own words are
  searchable.

---

## Priority order

If there's only time to record a few, do them in this order:

1. `field-reports` — the daily habit, and the biggest time saver
2. `command-center` — includes the `?` icon habit that unlocks everything else
3. `schedule`
4. `billing`
5. Everything else

---

## Checklist before uploading

- [ ] Under four minutes
- [ ] No client names or dollar figures on screen that shouldn't be shared
- [ ] Audio is intelligible (phone mic close, not across a shop)
- [ ] Visibility set to **Unlisted**
- [ ] Entry added to `client/src/lib/guide-videos.ts` with a `duration`
