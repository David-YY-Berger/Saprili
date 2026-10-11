# Saprili usability test

## Purpose

Find barriers that prevent a person who is not familiar with Saprili or web extensions from making, saving, and exporting a small book without coaching.

## Prepare

- Ask for informed consent to observe task completion and take notes. Do not record audio, video, API keys, or personal photos.
- Use a disposable Chrome profile and a synthetic or participant-approved sample book. Explain before the test that AI generation sends the selected English text and photos to Google and may cost money.
- If testing AI generation, use the owner's test key and budget only after the owner explicitly approves the call. Otherwise, observe the Generate dialog without starting a request.
- Keep this script and the blank observation sheet below. Do not help unless a task is blocked or the participant asks to stop.
- Ask the participant to think aloud. Record exact points of confusion, not guesses about what they meant.

## Tasks

1. **Open Saprili.** Find the extension and open the app. Explain what you think the Library is for.
2. **Set up AI access.** Find My settings and explain what an API key does and what information is sent to the provider. Do not ask the participant to reveal or type a personal key.
3. **Import a book.** Import the supplied UTF-8 CSV. Complete the required page-format setup and find the story pages.
4. **Add photos.** Open a story page and add the supplied test photo with the file picker. Find where the photo appears.
5. **Generate or review generation.** Open Generate, identify the call count and overwrite controls, and explain what Start generating will do. Start only if the owner-approved test key and budget are available.
6. **Fix a page.** Change one English or Hebrew text field, move between the page and the book outline, and verify the change is saved.
7. **Preview printing.** Open the print pre-flight, find the compatibility warnings, continue to the print view, and explain how to save a PDF.
8. **Protect the book.** Download a full backup, locate the downloaded ZIP, and explain how Restore backup handles a book with the same id.
9. **Optional restore.** In a disposable profile, restore the ZIP and verify that the book and its page images reappear.

## Observation sheet

| Task | Completed without help? | Time / notable delay | Misclicks or confusion (participant's words) | Severity |
|---|---|---|---|---|
| Open Saprili | | | | |
| Understand API key and privacy | | | | |
| Import and setup | | | | |
| Add a photo | | | | |
| Understand generation consent/cost | | | | |
| Edit and save a page | | | | |
| Print preview | | | | |
| Back up / restore | | | | |

## Success criteria

- The participant finishes tasks 1, 3, 4, 6, 7, and 8 without the observer operating the interface.
- Before any AI call, the participant can identify the call count, explain that generation sends selected data to Google, and explicitly choose whether to proceed.
- The participant can locate the backup ZIP and explain how it protects the local book.
- No book data is lost, no unintended AI request is sent, and no personal key is exposed during the test.

After the test, record findings in [`usability-findings.md`](./usability-findings.md) only if a test was actually conducted. Triage each observation as must-fix before release or later improvement; do not treat a single participant's preference as a product decision without review.
