// bisiyata dishmaya, leharbot ahava biyisral
export interface ImageModelEntry {
  id: string;
  provider: string;
  label: string;
  supportsEdit: boolean;
  imageCapable: boolean;
  roles: readonly ('illustration' | 'colouring')[];
}

export const MODEL_CATALOG: readonly ImageModelEntry[] = [
  {
    id: 'gemini-3-pro-image',
    provider: 'Google Gemini',
    label: 'Gemini 3 Pro Image (recommended for illustrations)',
    supportsEdit: true,
    imageCapable: true,
    roles: ['illustration', 'colouring'],
  },
  {
    id: 'gemini-3.1-flash-image',
    provider: 'Google Gemini',
    label: 'Gemini 3.1 Flash Image',
    supportsEdit: true,
    imageCapable: true,
    roles: ['illustration', 'colouring'],
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    provider: 'Google Gemini',
    label: 'Gemini 3.1 Flash Lite Image (recommended for colouring)',
    supportsEdit: true,
    imageCapable: true,
    roles: ['illustration', 'colouring'],
  },
];

export const imageModels = MODEL_CATALOG;

export function getImageModel(modelId: string): ImageModelEntry | undefined {
  return MODEL_CATALOG.find((model) => model.id === modelId && model.imageCapable);
}
