export default function Input({
  label, name, type = 'text', value, onChange, placeholder,
  error, required, autoComplete
}) {
  const id = name;
  return (
    <div className="w-full space-y-1">
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-600">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          // full-width long bar
          "w-full px-6 py-4",
          // long, soft gray bar styling
          "rounded-lg bg-white border border-gray-200",
          // nice focus state like the mock
          "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none",
          // text + placeholder with green styling
          "text-sm text-emerald-800 placeholder:text-emerald-700",
          // smooth transitions
          "transition-colors",
          // error state
          error ? "bg-red-50 border-red-500 focus:border-red-500 focus:ring-red-100" : ""
        ].join(" ")}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
