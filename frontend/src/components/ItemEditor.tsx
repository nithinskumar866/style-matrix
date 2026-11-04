import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useToast } from "@/context/ToastContext";
import { useApi } from "@/hooks/useApi";
import { CATEGORY_GROUPS, getCategoryName } from "@/lib/categories";
import type { ClothingItem } from "@/types";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { deleteImageFromSupabase } from "../../helper";

interface ItemEditorProps {
  item: ClothingItem;
  onClose: () => void;
  onSaved: (item: ClothingItem) => void;
  onDeleted: (item: ClothingItem) => void;
}

export default function ItemEditor({ item, onClose, onSaved, onDeleted }: ItemEditorProps) {
  const [category, setCategory] = useState(item.category);
  const [name, setName] = useState(item.name ?? "");
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { apiJson } = useApi();
  const { showToast } = useToast();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const changes = {
        category: Number(category),
        name: name.trim() || null,
        price: price === "" ? null : Number(price),
      };
      await apiJson(`/wardrobe/items/${item.id}`, "PATCH", changes);
      onSaved({ ...item, ...changes, category });
      showToast("Item updated.");
    } catch (error) {
      console.error(error);
      showToast("Couldn't save your changes. Please try again.", { isError: true });
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await apiJson(`/wardrobe/items/${item.id}`, "DELETE");
      await deleteImageFromSupabase(item.image_url);
      onDeleted(item);
      showToast("Item deleted.");
    } catch (error) {
      console.error(error);
      showToast("Couldn't delete this item. Please try again.", { isError: true });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit item</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-40 rounded-lg bg-zinc-200 mb-5">
          <img src={item.image_url} alt={getCategoryName(item.category)} className="w-full h-full object-contain" />
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <NativeSelect id="item-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.slot} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.name}</option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-name">Name (optional)</Label>
            <Input
              id="item-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blue office shirt"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-price">Price paid (optional)</Label>
            <Input
              id="item-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Used to work out cost per wear"
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full">Save changes</Button>
        </form>

        <div className="mt-5 pt-5 border-t">
          {confirmingDelete ? (
            <div className="space-y-3">
              <p className="text-sm">Delete this item for good? This also removes its wear history.</p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={busy} onClick={handleDelete} className="grow">Yes, delete</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirmingDelete(false)} className="grow">Keep it</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)} className="w-full text-red-400 hover:text-red-300">
              Delete item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
