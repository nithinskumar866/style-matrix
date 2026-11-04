import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SkeletonGrid } from "@/components/ui/page-states";
import { useToast } from "@/context/ToastContext";
import { useApi } from "@/hooks/useApi";
import { getCategoryName, SLOT_LABELS, WARDROBE_SLOTS } from "@/lib/categories";
import type { ClothingItem, ItemsResponse, WardrobeSlot } from "@/types";
import { Droplets, Pencil, Shirt } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ItemEditor from "./ItemEditor";

type WardrobeTab = "available" | "laundry";

const PAGE_SIZE = 24;

const itemsPath = (tab: WardrobeTab, slot: WardrobeSlot | null, offset: number) => {
  const params = new URLSearchParams({ status: tab, limit: String(PAGE_SIZE), offset: String(offset) });
  if (slot) params.set("slot", slot);
  return `/wardrobe/items?${params}`;
};

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active ? "bg-primary border-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
  }`;

export default function Wardrobe() {
  const [activeTab, setActiveTab] = useState<WardrobeTab>("available");
  const [slot, setSlot] = useState<WardrobeSlot | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [data, setData] = useState<(ItemsResponse & { requestKey: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState<ClothingItem | null>(null);
  const [washing, setWashing] = useState<number | null>(null);
  const { apiJson, isReady } = useApi();
  const { showToast } = useToast();

  const requestKey = `${activeTab}|${slot}|${reloadCount}`;

  useEffect(() => {
    if (!isReady) return;
    let isCurrent = true;

    apiJson<ItemsResponse>(itemsPath(activeTab, slot, 0))
      .then((response) => {
        if (isCurrent) setData({ ...response, requestKey });
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        if (isCurrent) setFailedKey(requestKey);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeTab, slot, requestKey, isReady, apiJson]);

  const reload = () => setReloadCount((count) => count + 1);

  const loadMore = async () => {
    if (!data) return;
    setLoadingMore(true);
    try {
      const next = await apiJson<ItemsResponse>(itemsPath(activeTab, slot, data.results.length));
      setData({ ...next, results: [...data.results, ...next.results], requestKey });
    } catch (err) {
      console.error(err);
      showToast("Couldn't load more items. Please try again.", { isError: true });
    } finally {
      setLoadingMore(false);
    }
  };

  const markWashed = async (item: ClothingItem) => {
    setWashing(item.id);
    try {
      await apiJson("/wardrobe/wash", "POST", { item_ids: [item.id] });
      showToast(`${getCategoryName(item.category)} is clean and back in your wardrobe.`);
      reload();
    } catch (err) {
      console.error(err);
      showToast("Couldn't update this item. Please try again.", { isError: true });
    } finally {
      setWashing(null);
    }
  };

  const hasFailed = failedKey === requestKey;
  const isLoading = !hasFailed && data?.requestKey !== requestKey;
  // Keep the last counts on screen while switching tabs
  const counts = data?.counts;

  return (
    <div>
      <PageHeader title="My Wardrobe" description="Your clothes, and what's in the wash." />

      <div role="tablist" className="flex gap-1 mb-4 border-b">
        {([["available", "Available"], ["laundry", "In the Wash"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? "border-indigo-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}{counts && ` (${counts[tab]})`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button aria-pressed={slot === null} onClick={() => setSlot(null)} className={chipClass(slot === null)}>All</button>
        {WARDROBE_SLOTS.map((value) => (
          <button key={value} aria-pressed={slot === value} onClick={() => setSlot(value)} className={chipClass(slot === value)}>
            {SLOT_LABELS[value]}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonGrid />}

      {hasFailed && (
        <EmptyState icon={Shirt} title="Couldn't load your closet" description="Check your connection and try again.">
          <Button onClick={reload}>Try again</Button>
        </EmptyState>
      )}

      {!isLoading && !hasFailed && data && data.results.length === 0 && (
        data.counts.available + data.counts.laundry === 0 && !slot ? (
          <EmptyState icon={Shirt} title="Your closet is empty" description="Add your first item and we'll sort it into the right category.">
            <Button asChild><Link to="/upload">Add your first item</Link></Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={activeTab === "available" ? Shirt : Droplets}
            title={activeTab === "available" ? "Nothing clean here right now" : "Nothing in the wash here"}
            description={slot ? "Try another category." : undefined}
          />
        )
      )}

      {!isLoading && !hasFailed && data && data.results.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.results.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                <div className="relative aspect-square overflow-hidden bg-zinc-200">
                  <img
                    src={item.image_url}
                    alt={item.name || getCategoryName(item.category)}
                    loading="lazy"
                    className={`w-full h-full object-contain ${item.in_wash ? "opacity-60 grayscale" : ""}`}
                  />
                  <button
                    onClick={() => setEditing(item)}
                    aria-label={`Edit ${item.name || getCategoryName(item.category)}`}
                    className="absolute top-2 right-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 grow flex flex-col gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name || getCategoryName(item.category)}</p>
                    {item.name && <p className="text-xs text-muted-foreground truncate">{getCategoryName(item.category)}</p>}
                    {item.in_wash && item.last_worn_date && (
                      <p className="text-xs text-muted-foreground">Worn {new Date(item.last_worn_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  {item.in_wash && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={washing === item.id}
                      onClick={() => markWashed(item)}
                      className="mt-auto"
                    >
                      <Droplets /> Mark as washed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.results.length < data.total && (
            <div className="flex justify-center mt-6">
              <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Loading..." : `Load more (${data.total - data.results.length} left)`}
              </Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <ItemEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onDeleted={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
