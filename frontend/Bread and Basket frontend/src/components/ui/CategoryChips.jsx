export const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Vegetables", value: "vegetables" },
  { label: "Fruits", value: "fruits" },
  { label: "Rice & Grains", value: "rice_grains" },
  { label: "Flour", value: "flour" },
  { label: "Cooking Oil", value: "cooking_oil" },
  { label: "Sugar", value: "sugar" },
  { label: "Pulses", value: "pulses" },
  { label: "Dairy & Eggs", value: "dairy_eggs" },
];

export default function CategoryChips({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map((item) => {
        const selected = value === item.value;
        return (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={selected}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              selected
                ? "bg-forest text-white"
                : "bg-white text-muted hover:bg-canvas"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
