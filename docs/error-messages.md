# User-facing error messages

Generated from [`src/i18n/en.ts`](../src/i18n/en.ts) by `node scripts/generate-error-messages.mjs`. Review that each message is plain-language and each next step is useful.

| Code | Message | Next step |
|---|---|---|
| `STORAGE_FAILED` | Saprili could not save or read your data. | Try again. If it keeps happening, download a backup and restart Chrome. |
| `STORAGE_QUOTA` | There is not enough space left to save. | Free up disk space, then try again. |
| `MIGRATION_FAILED` | Saprili could not open data saved by a different version. | Update Saprili to the latest version and try again. |
| `CSV_BAD_COLUMNS` | The file does not have the expected columns. | Use three columns: title, English text and Hebrew text. |
| `CSV_ODD_ROWS` | The file has the wrong number of rows. | Use one intro row followed by an even number of story rows. |
| `CSV_EMPTY_ROWS` | The file does not contain any book rows. | Add an intro row and choose the file again. |
| `CSV_BAD_ENCODING` | The Hebrew text in the file is not readable. | Save the file as CSV UTF-8 and choose it again. |
| `IMAGE_DECODE_FAILED` | This picture could not be opened. | Save the picture as JPEG or PNG and add it again. |
| `IMAGE_TOO_LARGE` | This picture is too large to use. | Choose a smaller version of the picture. |
| `AI_NO_KEY` | No AI key has been added yet. | Open My settings and paste your key. |
| `AI_AUTH` | The AI provider did not accept your key. | Check the key in My settings. |
| `AI_QUOTA` | The AI provider says your account has run out of credit or hit a limit. | Check your account with the provider, then try again. |
| `AI_REFUSED` | The AI provider chose not to draw this picture. | This is normal sometimes. Try again, or add a short hint. |
| `AI_TEMPORARY` | The AI provider is busy right now. | Wait a moment and try again. |
| `AI_BAD_RESPONSE` | The AI provider sent back something Saprili could not use. | Try again. |
| `AI_UNSUPPORTED_MODEL` | The chosen model cannot draw pictures. | Choose another model in My settings. |
| `JOB_INTERRUPTED` | Generation was interrupted. | Resume to continue from where it stopped. |
| `BACKUP_INVALID` | This file is not a valid Saprili backup. | Choose a backup file that Saprili created. |
| `BACKUP_TOO_NEW` | This backup was made by a newer version of Saprili. | Update Saprili, then restore the backup again. |
| `PRINT_ASSET_FAILED` | Some pictures or fonts could not be prepared for printing. | Go back, then try printing again. |
