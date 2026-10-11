// bisiyata dishmaya, leharbot ahava biyisral
export interface ImageModelEntry {
  id: string;
  provider: string;
  label: string;
  supportsEdit: boolean;
  imageCapable: boolean;
}

// The provider is deliberately not selected until the Phase 0 evaluation.
export const imageModels: readonly ImageModelEntry[] = [
  {
    id: 'provider-to-be-chosen',
    provider: 'Not selected',
    label: 'Image model (provider to be chosen)',
    supportsEdit: false,
    imageCapable: true,
  },
];
