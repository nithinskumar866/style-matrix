import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-states";
import { useToast } from "@/context/ToastContext";
import { useApi } from "@/hooks/useApi";
import { getCategoryName } from "@/lib/categories";
import type { SavedOutfit, StoredOutfitItem, WornOutfit } from "@/types";
import { Bookmark, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import OutfitPieces from "./OutfitPieces";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const piecesFor = (items: StoredOutfitItem[]) =>
  items.map((item) => ({ key: item.id, url: item.url, label: getCategoryName(item.category) }));

export default function OutfitCalendar() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [reloadCount, setReloadCount] = useState(0);
  const [history, setHistory] = useState<{ requestKey: string; results: WornOutfit[] } | null>(null);
  const [saved, setSaved] = useState<SavedOutfit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { apiJson, isReady } = useApi();
  const { showToast } = useToast();

  const requestKey = `${month.getTime()}|${reloadCount}`;

  useEffect(() => {
    if (!isReady) return;
    let isCurrent = true;
    const params = new URLSearchParams({
      start: month.toISOString(),
      end: new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString(),
      limit: "100",
    });

    Promise.all([
      apiJson<{ results: WornOutfit[] }>(`/wardrobe/history?${params}`),
      apiJson<{ results: SavedOutfit[] }>("/wardrobe/saved-outfits"),
    ])
      .then(([historyResponse, savedResponse]) => {
        if (!isCurrent) return;
        setHistory({ requestKey, results: historyResponse.results });
        setSaved(savedResponse.results);
        setFailed(false);
      })
      .catch((error) => {
        console.error(error);
        if (isCurrent) setFailed(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [month, requestKey, isReady, apiJson]);

  const reload = () => setReloadCount((count) => count + 1);

  const undoWear = async (outfitKey: string) => {
    try {
      await apiJson("/wardrobe/undo-wear", "POST", { outfit_key: outfitKey });
      showToast("Removed from your calendar.");
      reload();
    } catch (error) {
      console.error(error);
      showToast("Couldn't undo that. Please try again.", { isError: true });
    }
  };

  const wearSaved = async (outfit: SavedOutfit) => {
    try {
      const { outfit_key } = await apiJson<{ outfit_key: string }>("/wardrobe/wear-today", "POST", {
        item_ids: outfit.items.map((item) => item.id),
      });
      showToast(`Logged "${outfit.name}" for today.`, {
        action: { label: "Undo", onClick: () => undoWear(outfit_key) },
      });
      reload();
    } catch (error) {
      console.error(error);
      showToast("Couldn't log this outfit. Please try again.", { isError: true });
    }
  };

  const deleteSaved = async (outfit: SavedOutfit) => {
    try {
      await apiJson(`/wardrobe/saved-outfits/${outfit.id}`, "DELETE");
      reload();
    } catch (error) {
      console.error(error);
      showToast("Couldn't delete this outfit. Please try again.", { isError: true });
    }
  };

  const worn = history?.requestKey === requestKey ? history.results : [];
  const outfitsByDay = new Map<string, WornOutfit[]>();
  for (const outfit of worn) {
    const key = dayKey(new Date(outfit.worn_at));
    outfitsByDay.set(key, [...(outfitsByDay.get(key) ?? []), outfit]);
  }

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // getDay() starts on Sunday, and this calendar starts on Monday
  const leadingBlanks = (month.getDay() + 6) % 7;
  const today = dayKey(new Date());
  const selectedOutfits = outfitsByDay.get(selectedDay) ?? [];

  const changeMonth = (change: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + change, 1));
  };

  return (
    <div className="max-w-5xl pb-8">
      <PageHeader title="Calendar" description="What you wore, and the outfits you saved." />

      {failed && <p className="text-sm text-red-400 mb-4">Couldn't load your calendar. Please try again.</p>}

      <div className="rounded-2xl border bg-card p-3 md:p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
          <p className="font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
          {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }, (_, index) => <div key={index} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
            const key = dayKey(date);
            const outfits = outfitsByDay.get(key) ?? [];
            const thumbnail = outfits[0]?.items[0];
            return (
              <button
                key={key}
                aria-pressed={selectedDay === key}
                aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}, ${outfits.length} outfits`}
                onClick={() => setSelectedDay(key)}
                className={`relative aspect-square overflow-hidden rounded-lg border text-left transition-colors ${
                  selectedDay === key ? "border-indigo-400" : "border-transparent hover:border-border"
                } ${thumbnail ? "bg-zinc-200" : "bg-muted/40"}`}
              >
                {thumbnail && <img src={thumbnail.url} alt="" className="absolute inset-0 w-full h-full object-contain" />}
                <span className={`absolute top-1 left-1 rounded px-1 text-xs ${thumbnail ? "bg-black/70 text-white" : ""} ${key === today ? "font-bold text-indigo-300" : ""}`}>
                  {index + 1}
                </span>
                {outfits.length > 1 && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[11px] text-white">×{outfits.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedOutfits.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4 mb-10">
          {selectedOutfits.map((outfit) => (
            <div key={outfit.outfit_key} className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold">{new Date(outfit.worn_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                <Button size="sm" variant="ghost" onClick={() => undoWear(outfit.outfit_key)}>Remove</Button>
              </div>
              <OutfitPieces pieces={piecesFor(outfit.items)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-10">
          <EmptyState icon={CalendarDays} title="Nothing logged for this day" description='Tap "Wear today" on an outfit to add it here.' />
        </div>
      )}

      <h3 className="text-lg font-semibold mb-4">Saved outfits</h3>
      {saved && saved.length === 0 && (
        <EmptyState icon={Bookmark} title="No saved outfits yet" description='Tap "Save" on an outfit idea to keep it here.' />
      )}
      {saved && saved.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4">
          {saved.map((outfit) => (
            <div key={outfit.id} className="rounded-2xl border bg-card overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-sm font-semibold truncate">{outfit.name}</p>
              <OutfitPieces pieces={piecesFor(outfit.items)} />
              <div className="flex gap-2 p-3">
                <Button size="sm" onClick={() => wearSaved(outfit)}>Wear today</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSaved(outfit)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
