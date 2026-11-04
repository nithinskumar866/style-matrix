interface Piece {
  key: string | number;
  url: string;
  label: string;
}

const columnsFor = (count: number) => {
  if (count === 1) return "grid-cols-1";
  if (count === 2 || count === 4) return "grid-cols-2";
  return "grid-cols-3";
};

export default function OutfitPieces({ pieces }: { pieces: Piece[] }) {
  return (
    <div className={`grid gap-1 p-1 ${columnsFor(pieces.length)}`}>
      {pieces.map((piece) => (
        <div key={piece.key} className="relative aspect-square overflow-hidden rounded-lg bg-zinc-200">
          <img src={piece.url} alt={piece.label} loading="lazy" className="w-full h-full object-contain" />
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
            {piece.label}
          </span>
        </div>
      ))}
    </div>
  );
}
