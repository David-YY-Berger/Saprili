// bisiyata dishmaya, leharbot ahava biyisral
import { Banner } from '@/ui/Banner';

export function PrivacyNotice() {
  return (
    <Banner type="warning" title="Before you generate pictures:">
      Photos and English text are sent to Google Gemini when you choose to generate. Hebrew text is
      not sent. Saprili asks for Gemini network access when you start the first generation.
    </Banner>
  );
}
