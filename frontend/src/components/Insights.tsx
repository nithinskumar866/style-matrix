import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-states";
import { useApi } from "@/hooks/useApi";
import { getCategoryName, SLOT_LABELS, WARDROBE_SLOTS } from "@/lib/categories";
import type { InsightItem, Insights as InsightsData } from "@/types";
import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ItemList({ title, items, detail, empty }: {
  title: string;
  items: InsightItem[];
  detail: (item: InsightItem) => string;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <img src={item.url} alt="" loading="lazy" className="w-11 h-11 rounded-lg bg-zinc-200 object-contain shrink-0" />
              <span className="text-sm truncate grow">{item.name || getCategoryName(item.category)}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{detail(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const wearCount = (item: InsightItem) => `${item.wear_count} ${item.wear_count === 1 ? "wear" : "wears"}`;

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [failed, setFailed] = useState(false);
  const { apiJson, isReady } = useApi();

  useEffect(() => {
    if (!isReady) return;
    let isCurrent = true;
    apiJson<InsightsData>("/wardrobe/insights")
      .then((response) => {
        if (isCurrent) setData(response);
      })
      .catch((error) => {
        console.error(error);
        if (isCurrent) setFailed(true);
      });
    return () => {
      isCurrent = false;
    };
  }, [isReady, apiJson]);

  if (failed) return <EmptyState icon={BarChart3} title="Couldn't load your insights" description="Please try again in a moment." />;

  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-2xl border bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (data.total_items === 0) {
    return (
      <EmptyState icon={BarChart3} title="Nothing to analyse yet" description="Add some clothes and start logging outfits.">
        <Button asChild><Link to="/upload">Add your first item</Link></Button>
      </EmptyState>
    );
  }

  const tiles = [
    { label: "Items", value: data.total_items },
    { label: "In the wash", value: data.in_wash },
    { label: "Times worn", value: data.total_wears },
    { label: "Never worn", value: data.never_worn_count },
  ];
  const largestSlot = Math.max(...Object.values(data.by_slot), 1);

  return (
    <div className="max-w-5xl pb-8">
      <PageHeader title="Insights" description="How you really use your wardrobe. Wears are counted from when you log them here." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border bg-card p-4">
            <p className="text-3xl font-bold tabular-nums">{tile.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4 mb-6">
        <h3 className="text-sm font-semibold mb-4">Items by type</h3>
        <ul className="space-y-2">
          {WARDROBE_SLOTS.map((slot) => (
            <li key={slot} title={`${SLOT_LABELS[slot]}: ${data.by_slot[slot]}`} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">{SLOT_LABELS[slot]}</span>
              <span className="grow">
                <span
                  className="block h-2 min-w-0.5 rounded-r bg-indigo-500"
                  style={{ width: `${(data.by_slot[slot] / largestSlot) * 100}%` }}
                />
              </span>
              <span className="w-8 text-right tabular-nums">{data.by_slot[slot]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ItemList title="Most worn" items={data.most_worn} detail={wearCount} empty="Log an outfit to see this." />
        <ItemList title="Least worn" items={data.least_worn} detail={wearCount} empty="Log an outfit to see this." />
        <ItemList title="Never worn" items={data.never_worn} detail={() => "0 wears"} empty="You've worn everything you own." />
        <ItemList
          title="Lowest cost per wear"
          items={data.best_value}
          detail={(item) => `${item.cost_per_wear?.toFixed(2)} per wear`}
          empty="Add a price to a worn item in your wardrobe to see this."
        />
      </div>
    </div>
  );
}
