import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, SkeletonGrid } from "@/components/ui/page-states";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useApi } from "@/hooks/useApi";
import { getCurrentWeather } from "@/lib/weather";
import type { Outfit, OutfitSlot, Recommendation, Weather } from "@/types";
import { Bookmark, CloudSun, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import OutfitPieces from "./OutfitPieces";

const SLOT_ORDER: OutfitSlot[] = ["outer", "top", "bottom", "fullbody", "shoes", "accessory"];
const SLOT_NAMES: Record<OutfitSlot, string> = {
  outer: "Layer",
  top: "Top",
  bottom: "Bottom",
  fullbody: "Full body",
  shoes: "Shoes",
  accessory: "Accessory",
};
const TODAY_PROMPT = "What should I wear today?";

const outfitItemIds = (outfit: Outfit) =>
  SLOT_ORDER.flatMap((slot) => (outfit[slot] ? [outfit[slot].id] : []));

const outfitKey = (outfit: Outfit) => outfitItemIds(outfit).join("-");

export default function OutfitIdeas() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyOutfit, setBusyOutfit] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const { user } = useAppContext();
  const { apiJson } = useApi();
  const { showToast } = useToast();

  const styleProfile = () => {
    const metadata = user?.user_metadata;
    if (!metadata || metadata.use_profile_for_suggestions === false) return null;
    const height = Number(metadata.height);
    return {
      gender: metadata.gender?.toLowerCase() || null,
      body_type: metadata.bodytype?.toLowerCase() || null,
      skin_tone: metadata.skintone?.toLowerCase() || null,
      height: height > 0 ? height : null,
    };
  };

  const loadWeather = async () => {
    setLoadingWeather(true);
    try {
      const current = await getCurrentWeather();
      setWeather(current);
      return current;
    } catch (error) {
      console.error(error);
      showToast("Couldn't get your weather. Check that location access is allowed.", { isError: true });
      return null;
    } finally {
      setLoadingWeather(false);
    }
  };

  const getRecommendations = async (prompt: string, currentWeather: Weather | null) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiJson<{ recommendations?: Recommendation[] }>("/recommendation/recommend", "POST", {
        prompt,
        weather: currentWeather,
        profile: styleProfile(),
      });
      const results = data.recommendations || [];
      setRecommendations(results);
      if (results.length === 0) {
        setMessage("No matching outfits yet. Add more clothes or try another prompt.");
      }
    } catch (error) {
      console.error(error);
      setRecommendations([]);
      setMessage("Couldn't get suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) getRecommendations(query, weather);
  };

  const handleWhatToday = async () => {
    setQuery(TODAY_PROMPT);
    getRecommendations(TODAY_PROMPT, weather ?? await loadWeather());
  };

  const handleWearToday = async (index: number, result: Recommendation) => {
    const key = outfitKey(result.outfit);
    setBusyOutfit(key);
    try {
      const { outfit_key } = await apiJson<{ outfit_key: string }>("/wardrobe/wear-today", "POST", {
        item_ids: outfitItemIds(result.outfit),
      });
      setRecommendations((current) => current.filter((_, i) => i !== index));
      showToast("Outfit logged, and these clothes are now in the wash.", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await apiJson("/wardrobe/undo-wear", "POST", { outfit_key });
              setRecommendations((current) => [...current.slice(0, index), result, ...current.slice(index)]);
            } catch (error) {
              console.error(error);
              showToast("Couldn't undo that. Please try again.", { isError: true });
            }
          },
        },
      });
    } catch (error) {
      console.error("Error updating wear status:", error);
      showToast("Couldn't log this outfit. Please try again.", { isError: true });
    } finally {
      setBusyOutfit(null);
    }
  };

  const handleReaction = async (result: Recommendation, liked: boolean) => {
    const key = outfitKey(result.outfit);
    const previous = reactions[key];
    setReactions((current) => ({ ...current, [key]: liked }));
    try {
      await apiJson("/feedback/", "POST", {
        item_ids: outfitItemIds(result.outfit),
        liked,
        occasion: query || null,
        predicted_score: result.score,
      });
    } catch (error) {
      console.error(error);
      setReactions((current) => ({ ...current, [key]: previous }));
      showToast("Couldn't save your reaction. Please try again.", { isError: true });
    }
  };

  const handleSave = async (result: Recommendation) => {
    const key = outfitKey(result.outfit);
    setBusyOutfit(key);
    try {
      await apiJson("/wardrobe/saved-outfits", "POST", {
        name: query.trim().slice(0, 100) || "My outfit",
        item_ids: outfitItemIds(result.outfit),
      });
      setSaved((current) => ({ ...current, [key]: true }));
      showToast("Saved. You'll find it under Calendar.");
    } catch (error) {
      console.error(error);
      showToast("Couldn't save this outfit. Please try again.", { isError: true });
    } finally {
      setBusyOutfit(null);
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="Outfit Ideas" description="Describe an occasion, the weather or a vibe, and get outfits from your own clothes." />

      <div className="rounded-2xl border bg-card p-4 md:p-6 mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            aria-label="Describe what you need an outfit for"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={500}
            placeholder="e.g. Formal wear for an interview"
            className="h-11 grow"
          />
          <Button type="submit" size="lg" disabled={loading || !query.trim()} className="h-11">
            <Sparkles /> {loading ? "Finding outfits..." : "Suggest outfits"}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button type="button" variant="secondary" size="sm" disabled={loading || loadingWeather} onClick={handleWhatToday}>
            {TODAY_PROMPT}
          </Button>
          {weather ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setWeather(null)} aria-label="Stop using my weather">
              <CloudSun /> {Math.round(weather.temperature)}°C, {weather.condition} ×
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled={loadingWeather} onClick={loadWeather}>
              <CloudSun /> {loadingWeather ? "Checking..." : "Use my weather"}
            </Button>
          )}
        </div>
      </div>

      {loading && <SkeletonGrid count={4} />}

      {!loading && message && <EmptyState icon={Sparkles} title={message} />}

      {!loading && recommendations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-8">
          {recommendations.map((result, index) => {
            const key = outfitKey(result.outfit);
            const reaction = reactions[key];
            const pieces = SLOT_ORDER.flatMap((slot) => {
              const piece = result.outfit[slot];
              return piece ? [{ key: slot, url: piece.url, label: SLOT_NAMES[slot] }] : [];
            });

            return (
              <div key={key} className="rounded-2xl border bg-card overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-semibold">{index === 0 ? "Best match" : `Option ${index + 1}`}</span>
                  <span className="text-xs text-muted-foreground">{(result.score * 100).toFixed(0)}% match</span>
                </div>

                <OutfitPieces pieces={pieces} />

                <div className="flex flex-wrap items-center gap-2 p-3 mt-auto">
                  <Button size="sm" disabled={busyOutfit === key} onClick={() => handleWearToday(index, result)}>
                    {busyOutfit === key ? "Saving..." : "Wear today"}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busyOutfit === key || saved[key]} onClick={() => handleSave(result)}>
                    <Bookmark /> {saved[key] ? "Saved" : "Save"}
                  </Button>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon-sm"
                      variant={reaction === true ? "default" : "ghost"}
                      aria-label="I like this outfit"
                      aria-pressed={reaction === true}
                      onClick={() => handleReaction(result, true)}
                    >
                      <ThumbsUp />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant={reaction === false ? "default" : "ghost"}
                      aria-label="I don't like this outfit"
                      aria-pressed={reaction === false}
                      onClick={() => handleReaction(result, false)}
                    >
                      <ThumbsDown />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
