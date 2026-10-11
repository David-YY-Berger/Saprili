<!-- bisiyata dishmaya, leharbot ahava biyisral -->

# 06. AI generation and job queue

Code: `src/ai/*` (provider, prompts, post-processing, generation service), `src/background/jobs/*` (queue), `src/features/generate/*` (dialog). **Status: built and mock-tested; never run against the real Gemini API or a real long batch** (see [TODO.md](./TODO.md)).

## Provider and keys
- Google Gemini API only. Defaults: illustrations `gemini-3-pro-image`, colouring `gemini-3.1-flash-lite-image`; `gemini-3.1-flash-image` also selectable (`ai/modelCatalog.ts`; all three support edit). Separate selectors in My settings.
- Each user supplies a paid-tier key. The key is passed into the provider, never logged. My settings states that photos and English text leave the computer for Google.
- `ImageProvider` (`generateImage`, `editImage`) is the only module that knows vendor request formats. `qualityTier` is `medium`. `GeminiImageProvider` defaults its injected `fetcher` to a wrapper `(input, init) => fetch(input, init)`; a bare `fetch` stored as a method throws "Illegal invocation" before any network call, which surfaced as `AI_TEMPORARY` ("provider is busy") with nothing in the Network tab. Any fetch failure maps to `AI_TEMPORARY` with the original error as `cause`. `MockImageProvider` (build flag `SAPRILI_PROVIDER=mock`, optional `SAPRILI_MOCK_DELAY_MS`; fault injection `refuse`, `rateLimit`, `timeout`, `badResponse`) is the only provider used in automated tests.
- Errors map to `AI_NO_KEY`, `AI_AUTH`, `AI_QUOTA`, `AI_REFUSED`, `AI_TEMPORARY`, `AI_BAD_RESPONSE`. Refusals (real people, children) are a normal explained result with a retry suggestion; missing key links to My settings; quota stops clearly.
- **Cost guardrail:** every image request follows an explicit user action (single click, or one "Start generating" for a batch that first shows the call count). The only automatic repeats are bounded retries of temporary errors (≤3 attempts per job). Retry and colouring are new provider calls. No dollar estimate is promised; users check their Google AI account.

## Requests (each call stands alone)
Built in `ai/prompts.ts` from instruction constants in `ai/promptTemplates.ts` (easy to tune).
- **Main characters (`getCharacterReference`):** up to 6 intro characters (`MAX_AI_CHARACTERS`) are sent as reference pictures, **first and in order**, with a text list `- Name (reference picture N): description` (or `(no picture)`), so each description is tied to its picture. Characters with neither picture, name nor description are skipped; extras beyond 6 are flagged "Not sent to AI". **When the intro has characters, intro photos are not sent**; with none, the old behaviour (up to 3 intro photos) applies. Intro English text is still sent.
- **Illustration:** character reference (above) + intro English text + page English text + page AI-copy photos + art-style text. Never sent: Hebrew, other pages, any illustration. Instructions: learn characters from the list/pictures (or intro photos); use page text/photos to decide who appears and what happens; keep each character consistent with their picture and description; cute simple cartoon in the art style; reuse real objects/places; **no written text in the picture**; fixed picture shape; calm space at the edges. Custom prompt is **appended to instructions, never to page text**.
- **Colouring:** only that page's illustration; pure black-and-white line art for a 4-year-old, thick outlines, big shapes, no shading/grey/text, same shape. Disabled without an illustration (no call is made).
- **Cover illustration:** same character reference (else intro photos) + intro English text + art-style text; one cute cartoon family portrait at the cover picture shape, no text.
- **Edit mode:** supplied current illustration + custom instruction (when the model supports edit).
- Mandatory payload tests assert: no Hebrew characters in any request, no other pages' content, no illustration in an illustration request, only that page's illustration in a colouring request. `describeRequestForDebug` omits keys and image bytes.
- Known risk: characters may drift between pages (mitigated by the main characters list; not yet tested against the real API).

## Post-processing (`ai/postprocess.ts`, worker-safe)
- Gemini may not return the exact picture shape: **centre-crop the smallest excess edge**; pre-flight `AI_ASPECT_CROP` warns when >3% of an edge was removed (owner-approved).
- Colouring output: `detectGreyLevels`, then `forceBlackWhite` only when grey is detected.

## Generation service (`ai/generationService.ts`; no DOM/React; takes `deps`)
`generateIllustrationForPage`, `generateColouringForPage`, `generateCoverIllustration`, `restoreIllustrationVersion`, `uploadOwnIllustration`, `pushIllustrationVersion`, `markColouringOutdated`.
- Stores images as returned (`meta.source = generated`, model, date). Replacing an illustration moves the old one to history (max 3; older images deleted) and marks that page's colouring `outdated`.
- Saves with reason `generation` only after success. Each result is applied to the freshly re-read book under a per-book lock (`applyToLatestBook`), so concurrent jobs never lose results; the open page editor merges generated pictures (`useBookStore.mergeGenerated`).

## Job queue (runs in the service worker)
- **Job:** `id`, `batchId`, `bookId`, `kind` (`illustration|colouring|coverIllustration`), `target` (`{story, pageId}` | `{cover}`), `overwrite`, `dependsOnJobId`, `status` (`queued|running|succeeded|failed|cancelled|paused`), `step` (`pending|generating|postprocessing|saving|done`), `attempts`, `errorCode?`, `errorMessage?`, `retryAfter?`, timestamps. **JobBatch:** `id`, `bookId`, `jobIds`, `createdAt`, `state` (`running|paused|completed|cancelled`), `pauseReason?`.
- `JobQueue` serialises changes and writes them to storage **before** announcing them (state is persisted after every step). `JobRunner` runs up to 2 jobs at a time; dependent colouring jobs wait for their illustration (if it failed/cancelled they fail `DEPENDENCY_FAILED`; "retry failed" re-runs them).
- **Retries:** `AI_TEMPORARY` → 2 s then 8 s backoff, max 3 attempts. `AI_REFUSED`/other errors fail only that job. **Fatal stop** on `AI_AUTH`/`AI_QUOTA`/`AI_NO_KEY`: the job is handed back unspent, the batch pauses with a `pauseReason` and a `ResumePrompt`. A batch is `completed` when nothing is queued/running, even with failed jobs.
- **Cancel:** stops everything not yet sent; a call already sent finishes and its result is kept.
- **Interruptions:** `resumeOnStartup` runs once per host start. A `running` job returns to the queue unless its picture was already saved after it started (`hasOutputSince`) → marked done, never run twice. Idle worker restart continues automatically; a browser/extension restart pauses open batches (`JOB_INTERRUPTED`) and the next app open shows `ResumePrompt`. An interrupted call restarts at `pending` (only `pending`/`generating`/`done` are resumable steps).
- **Keep-alive (UNVERIFIED):** while work is queued or a retry waits, the worker calls `chrome.runtime.getPlatformInfo()` every 20 s (resets Chrome's 30 s idle timer; an in-flight request also keeps it alive). No `alarms` permission, so a worker Chrome kills while the browser stays open with the tab closed is only recovered when the app is next opened or a message arrives.
- **Host mode:** meta key `jobHostMode`, `background` (default) or `tab` (`InTabJobHost`, same queue/runner with a local message bus; pauses open batches on start). Switch in My settings → Advanced; applies on next app open. Which mode ships is undecided.
- **Messaging (`shared/messaging.ts`):** commands tab→worker `jobs/enqueue`, `jobs/cancelBatch`, `jobs/retryFailed`, `jobs/getSnapshot`, `jobs/resume`; events worker→tab `jobs/progress`, `jobs/batchStateChanged`, `jobs/fatalStop`; one typed `JobsMessage` union.
- **Plan builder (`features/generate/jobPlan.ts`, pure):** `parsePageRange`, `selectAll`, `selectMissingIllustration`, `getColouringBlockReason`, `buildJobPlan` → `{jobs, summary {illustrations, colourings, totalCalls}, skipped}`.
- Tests: `JobHost.test.ts` (concurrency ≤2, dependency order, state written before finish, fatal stop/resume, refusal + retry failed, backoff/3-attempt limit, cancel, restart continue/pause/already-saved), `jobPlan.test.ts`, `npm run e2e:jobs` (mock provider: start a 5-job batch, close the tab, reopen, verify completion with no duplicates).
