// bisiyata dishmaya, leharbot ahava biyisral
export interface ImageGenRequest {
  instructions: string;
  referenceImages: Blob[];
  targetAspect: number;
  sizeHint: string;
  qualityTier: 'medium';
}

export interface ImageGenResult {
  image: Blob;
  widthPx: number;
  heightPx: number;
  modelId: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface ImageProvider {
  generateImage(request: ImageGenRequest): Promise<ImageGenResult>;
  editImage(request: ImageGenRequest): Promise<ImageGenResult>;
}

export type ProviderFactory = (modelId: string, apiKey: string) => ImageProvider;
