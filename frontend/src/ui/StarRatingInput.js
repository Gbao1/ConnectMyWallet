function Star({ filled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`transition ${filled ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
      aria-label={label}
    >
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  );
}

export default function StarRatingInput({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const current = i + 1;
          return (
            <Star
              key={current}
              filled={current <= value}
              onClick={() => onChange(current)}
              label={`${label}: ${current} stars`}
            />
          );
        })}
        <span className="ml-1 text-xs text-gray-500">{value}/5</span>
      </div>
    </div>
  );
}
