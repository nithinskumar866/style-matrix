export interface ClothingItem {
  id: number;
  name: string | null;
  image_url: string;
  category: string;
  last_worn_date: string | null;
  score: number | null;
}

export interface OutfitItem {
  id: number;
  url: string;
}

export type OutfitSlot = "top" | "bottom" | "fullbody";

export type Outfit = Partial<Record<OutfitSlot, OutfitItem>>;

export interface Recommendation {
  score: number;
  outfit: Outfit;
}
