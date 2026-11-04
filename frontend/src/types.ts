export interface ClothingItem {
  id: number;
  name: string | null;
  image_url: string;
  category: string;
  last_worn_date: string | null;
  score: number | null;
  price: number | null;
  in_wash: boolean;
}

export interface ItemsResponse {
  results: ClothingItem[];
  total: number;
  counts: { available: number; laundry: number };
}

export type WardrobeSlot = "top" | "outer" | "bottom" | "full" | "shoes" | "accessory";

export interface OutfitItem {
  id: number;
  url: string;
}

export type OutfitSlot = "top" | "bottom" | "fullbody" | "outer" | "shoes" | "accessory";

export type Outfit = Partial<Record<OutfitSlot, OutfitItem>>;

export interface Recommendation {
  score: number;
  outfit: Outfit;
}

export interface Weather {
  temperature: number;
  condition: "clear" | "cloudy" | "rain" | "snow";
}

export interface StoredOutfitItem extends OutfitItem {
  category: string;
}

export interface WornOutfit {
  outfit_key: string;
  worn_at: string;
  items: StoredOutfitItem[];
}

export interface SavedOutfit {
  id: number;
  name: string;
  created_at: string;
  items: StoredOutfitItem[];
}

export interface InsightItem {
  id: number;
  url: string;
  category: string;
  name: string | null;
  price: number | null;
  wear_count: number;
  cost_per_wear: number | null;
}

export interface Insights {
  total_items: number;
  in_wash: number;
  total_wears: number;
  by_slot: Record<WardrobeSlot, number>;
  most_worn: InsightItem[];
  least_worn: InsightItem[];
  never_worn: InsightItem[];
  never_worn_count: number;
  best_value: InsightItem[];
}
