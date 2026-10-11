// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { createEmptyBook, createStoryPage } from '@/domain/factories';

const LONG_EN =
  'One sunny morning the whole family climbed into the car and drove to the hills outside the city. ' +
  'Dad carried the big blue blanket, Mum carried the basket full of fruit, and the children carried ' +
  'every toy they could fit into their pockets. When they found the perfect spot under the old olive ' +
  'tree, they spread out the blanket, ate until their tummies were round, and then lay back to watch ' +
  'the clouds turn into dragons, rabbits and ships.';

const LONG_HE =
  'בְּאֹתוֹ בֹּקֶר שִׁמְשִׁי עָלְתָה כָּל הַמִּשְׁפָּחָה לָרֶכֶב וְנָסְעָה אֶל הַגְּבָעוֹת שֶׁמִּחוּץ לָעִיר. ' +
  'אַבָּא נָשָׂא אֶת הַשְּׂמִיכָה הַכְּחֻלָּה הַגְּדוֹלָה, אִמָּא נָשְׂאָה אֶת הַסַּל הַמָּלֵא פֵּרוֹת, ' +
  'וְהַיְּלָדִים נָשְׂאוּ כָּל צַעֲצוּעַ שֶׁנִּכְנַס לַכִּיס.';

/** Sample content for the layout dev page and tests. No real family data. */
export function createSampleBook(nowIso = '2026-10-11T08:00:00.000Z'): Book {
  const book = createEmptyBook({ nowIso, id: 'sample-book' });
  book.intro = {
    ...book.intro,
    id: 'sample-intro',
    textEn: 'Meet the family: Dad, Mum and three little explorers.',
    textHe: 'הַכִּירוּ אֶת הַמִּשְׁפָּחָה: אַבָּא, אִמָּא וּשְׁלוֹשָׁה מְטַיְּלִים קְטַנִּים.',
  };
  book.storyPages = [
    createStoryPage({
      id: 'sample-story-1',
      textEn: 'We went to the park.',
      textHe: 'הָלַכְנוּ לַגִּנָּה.',
    }),
    createStoryPage({
      id: 'sample-story-2',
      textEn: 'The dog chased a butterfly all the way to the pond.',
      textHe: 'הַכֶּלֶב רָדַף אַחֲרֵי פַּרְפַּר עַד הַבְּרֵכָה.',
    }),
    createStoryPage({ id: 'sample-story-3', textEn: LONG_EN, textHe: LONG_HE }),
    createStoryPage({ id: 'sample-story-4', textEn: 'Time for a nap.', textHe: '' }),
    createStoryPage({ id: 'sample-story-5', textEn: '', textHe: 'לַיְלָה טוֹב.' }),
    createStoryPage({
      id: 'sample-story-6',
      textEn: 'Dinner was noisy and wonderful.\n\nEveryone talked at once.',
      textHe: 'אֲרוּחַת הָעֶרֶב הָיְתָה רוֹעֶשֶׁת וּנְפַלָּאָה.\n\nכֻּלָּם דִּבְּרוּ בְּבַת אַחַת.',
    }),
  ];
  return book;
}
