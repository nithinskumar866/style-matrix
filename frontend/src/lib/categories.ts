import type { WardrobeSlot } from "@/types";

// Classifier class names, in order. The model predicts an index into this list.
const CATEGORY_NAMES = [
  "Anorak", "Blazer", "Blouse", "Bomber", "Button-Down", "Cardigan", "Flannel", "Halter", "Henley", "Hoodie",
  "Jacket", "Jersey", "Parka", "Peacoat", "Poncho", "Sweater", "Tank", "Tee", "Top", "Turtleneck",
  "Capris", "Chinos", "Culottes", "Cutoffs", "Gauchos", "Jeans", "Jeggings", "Jodhpurs", "Joggers", "Leggings",
  "Sarong", "Shorts", "Skirt", "Sweatpants", "Sweatshorts", "Trunks", "Caftan", "Cape", "Coat", "Coverup",
  "Dress", "Jumpsuit", "Kaftan", "Kimono", "Nightdress", "Onesie", "Robe", "Romper", "Shirtdress", "Sundress",
  "Shoes", "Accessory",
];

export const getCategoryName = (category: string) => CATEGORY_NAMES[Number(category)] ?? "Uncategorized";

// Matches SLOT_CATEGORIES in backend/app/outfit_rules.py
const SLOT_CATEGORIES: Record<WardrobeSlot, number[]> = {
  top: [2, 4, 6, 7, 8, 9, 11, 15, 16, 17, 18, 19],
  outer: [0, 1, 3, 5, 10, 12, 13, 14, 37, 38],
  bottom: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
  full: [36, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
  shoes: [50],
  accessory: [51],
};

export const SLOT_LABELS: Record<WardrobeSlot, string> = {
  top: "Tops",
  outer: "Layers",
  bottom: "Bottoms",
  full: "Full body",
  shoes: "Shoes",
  accessory: "Accessories",
};

export const WARDROBE_SLOTS = Object.keys(SLOT_LABELS) as WardrobeSlot[];

export const CATEGORY_GROUPS = WARDROBE_SLOTS.map((slot) => ({
  slot,
  label: SLOT_LABELS[slot],
  options: SLOT_CATEGORIES[slot]
    .map((value) => ({ value, name: CATEGORY_NAMES[value] }))
    .sort((a, b) => a.name.localeCompare(b.name)),
}));
