export default function FormField({ label, id, error, ...inputProps }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        className={`w-full min-w-0 rounded-xl border-[1.5px] bg-white p-3 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-orange ${
          error ? "border-bad" : "border-line"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${id}-error`} className="text-[13px] text-bad" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
