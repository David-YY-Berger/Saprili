// bisiyata dishmaya, leharbot ahava biyisral
import { Banner } from '@/ui/Banner';

export function PrivacyNotice() {
  return (
    <Banner type="warning" title="Before you generate pictures:">
      Photos and English text are sent to the provider you choose. Hebrew text is not sent.
    </Banner>
  );
}
