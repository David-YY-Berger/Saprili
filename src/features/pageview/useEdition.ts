// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { Edition } from '@/layout/theme';

export function useEdition(initial: Edition = 'colour') {
  const [edition, setEdition] = useState<Edition>(initial);
  return { edition, setEdition };
}
