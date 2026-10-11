// bisiyata dishmaya, leharbot ahava biyisral
export const en = {
  'app.name': 'Saprili',
  'app.tagline': 'Your storybook scribe',
  'app.storage.ready': 'Storage is ready. Books saved on this computer: {count}.',
  'app.storage.failed': 'Storage is not available.',
  'print.placeholder': 'Printing arrives in a later version.',

  'errors.STORAGE_FAILED.message': 'Saprili could not save or read your data.',
  'errors.STORAGE_FAILED.next':
    'Try again. If it keeps happening, download a backup and restart Chrome.',
  'errors.STORAGE_QUOTA.message': 'There is not enough space left to save.',
  'errors.STORAGE_QUOTA.next': 'Free up disk space, then try again.',
  'errors.MIGRATION_FAILED.message': 'Saprili could not open data saved by a different version.',
  'errors.MIGRATION_FAILED.next': 'Update Saprili to the latest version and try again.',

  'errors.CSV_BAD_COLUMNS.message': 'The file does not have the expected columns.',
  'errors.CSV_BAD_COLUMNS.next': 'Use three columns: title, English text and Hebrew text.',
  'errors.CSV_ODD_ROWS.message': 'The file has the wrong number of rows.',
  'errors.CSV_ODD_ROWS.next': 'Use one intro row followed by an even number of story rows.',
  'errors.CSV_EMPTY_ROWS.message': 'The file does not contain any book rows.',
  'errors.CSV_EMPTY_ROWS.next': 'Add an intro row and choose the file again.',
  'errors.CSV_BAD_ENCODING.message': 'The Hebrew text in the file is not readable.',
  'errors.CSV_BAD_ENCODING.next': 'Save the file as CSV UTF-8 and choose it again.',

  'errors.IMAGE_DECODE_FAILED.message': 'This picture could not be opened.',
  'errors.IMAGE_DECODE_FAILED.next': 'Save the picture as JPEG or PNG and add it again.',
  'errors.IMAGE_TOO_LARGE.message': 'This picture is too large to use.',
  'errors.IMAGE_TOO_LARGE.next': 'Choose a smaller version of the picture.',

  'errors.AI_NO_KEY.message': 'No AI key has been added yet.',
  'errors.AI_NO_KEY.next': 'Open My settings and paste your key.',
  'errors.AI_AUTH.message': 'The AI provider did not accept your key.',
  'errors.AI_AUTH.next': 'Check the key in My settings.',
  'errors.AI_QUOTA.message':
    'The AI provider says your account has run out of credit or hit a limit.',
  'errors.AI_QUOTA.next': 'Check your account with the provider, then try again.',
  'errors.AI_REFUSED.message': 'The AI provider chose not to draw this picture.',
  'errors.AI_REFUSED.next': 'This is normal sometimes. Try again, or add a short hint.',
  'errors.AI_TEMPORARY.message': 'The AI provider is busy right now.',
  'errors.AI_TEMPORARY.next': 'Wait a moment and try again.',
  'errors.AI_BAD_RESPONSE.message': 'The AI provider sent back something Saprili could not use.',
  'errors.AI_BAD_RESPONSE.next': 'Try again.',
  'errors.AI_UNSUPPORTED_MODEL.message': 'The chosen model cannot draw pictures.',
  'errors.AI_UNSUPPORTED_MODEL.next': 'Choose another model in My settings.',

  'errors.JOB_INTERRUPTED.message': 'Generation was interrupted.',
  'errors.JOB_INTERRUPTED.next': 'Resume to continue from where it stopped.',

  'errors.BACKUP_INVALID.message': 'This file is not a valid Saprili backup.',
  'errors.BACKUP_INVALID.next': 'Choose a backup file that Saprili created.',
  'errors.BACKUP_TOO_NEW.message': 'This backup was made by a newer version of Saprili.',
  'errors.BACKUP_TOO_NEW.next': 'Update Saprili, then restore the backup again.',

  'errors.PRINT_ASSET_FAILED.message': 'Some pictures or fonts could not be prepared for printing.',
  'errors.PRINT_ASSET_FAILED.next': 'Go back, then try printing again.',
} as const;
