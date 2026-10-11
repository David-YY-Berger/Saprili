// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';

const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com/*';

export async function requestGeminiPermission(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    throw new AppError('AI_TEMPORARY', {
      userMessage: 'Gemini network access is unavailable in this browser.',
      nextStep: 'Open Saprili in Chrome and try again.',
    });
  }
  let granted: boolean;
  try {
    granted = await chrome.permissions.request({ origins: [GEMINI_ORIGIN] });
  } catch (cause) {
    throw new AppError('AI_TEMPORARY', {
      userMessage: 'Saprili could not request Gemini network access.',
      nextStep: 'Check the extension permissions in Chrome, then try again.',
      cause,
    });
  }
  if (!granted) {
    throw new AppError('AI_TEMPORARY', {
      userMessage: 'Gemini network access was not granted.',
      nextStep: 'Allow the optional Gemini permission when you start generation.',
    });
  }
}
