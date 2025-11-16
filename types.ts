
export interface NewsArticle {
  headline: string;
  summary: string;
  keyDetails: string[];
  imageUrl: string;
  fullContent?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  }
}

// Fix: Add missing GeolocationState interface.
export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

export interface SavedVibe {
  topic: string;
  location: string;
  rssUrl?: string;
}
