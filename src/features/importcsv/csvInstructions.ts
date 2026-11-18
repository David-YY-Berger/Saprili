// bisiyata dishmaya, leharbot ahava biyisral
// Shown on the import screen; the user pastes this text to their LLM and uploads the CSV it produces.
export const CSV_LLM_INSTRUCTIONS = `Create a CSV file (UTF-8) for a children's book. Output only the CSV content.
Rules:
1. Exactly 3 columns, in this order, with this header row: title,english,hebrew
2. One row per story page. "title" is a short private label (never printed). "english" and "hebrew" are the page texts (Hebrew in Hebrew letters).
3. Do NOT include an intro row: the intro page is made separately in the app.
4. The number of story rows must be EVEN (pages come in pairs: 2, 4, 6...).
5. Wrap every text cell in double quotes; write a double quote inside text as "". Line breaks inside a cell are allowed.
6. Optional: a row of only hyphens in the title and two empty cells (for example ---------,,) may be placed between pairs, never between the two pages of a pair.
7. No other columns, no notes, no markdown fences.
Example:
title,english,hebrew
"Page 1","The sun came up.","<Hebrew text>"
"Page 2","We went to the park.","<Hebrew text>"`;
