const TONES = {
  orange: "bg-orange-soft text-orange-text",
  green: "bg-lime-soft text-forest",
  grey: "bg-grey-soft text-ink-2",
};

export default function Badge({ tone = "grey", className = "", children }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
