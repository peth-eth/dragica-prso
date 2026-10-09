type Props = {
  label: string;
  hint?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  field?: "input" | "none";
};

export default function NewsletterOptionList({ label, hint, options, value, onChange, field = "input" }: Props) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {hint && <p className="-mt-1 mb-2 text-xs text-gray-500">{hint}</p>}
      <div className="mb-2 space-y-2">
        {options.map((option) => (
          <button type="button" key={option} onClick={() => onChange(option)} className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${value === option ? "border-teal-earring bg-teal-light font-bold text-teal-earring" : "border-warm-200 bg-white text-plum-900 hover:border-teal-earring/60"}`}>
            {option}
          </button>
        ))}
      </div>
      {field !== "none" && <input className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}
