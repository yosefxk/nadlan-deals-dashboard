import { X } from 'lucide-react';

export interface FilterPill {
  key: string;
  label: string;
  value: string;
}

interface Props {
  filters: FilterPill[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilters({ filters, onRemove, onClearAll }: Props) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-100 border border-slate-200 text-slate-700"
        >
          <span className="font-medium text-slate-500">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.key)}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
            title="הסר סינון"
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
      >
        נקה הכל
      </button>
    </div>
  );
}
