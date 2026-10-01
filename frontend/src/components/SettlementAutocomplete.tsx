import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { autocomplete } from '../api';

interface Props {
  selected: string[];
  onChange: (settlements: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
  className?: string;
  singleSelect?: boolean;
}

export default function SettlementAutocomplete({
  selected,
  onChange,
  maxSelections = 5,
  placeholder = 'חפש יישוב...',
  className = '',
  singleSelect = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ settlement: string; deals: number }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await autocomplete(query);
        setSuggestions(res.data || []);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (settlement: string) => {
    if (singleSelect) {
      onChange([settlement]);
      setQuery('');
      setIsOpen(false);
      return;
    }
    if (selected.length < maxSelections && !selected.includes(settlement)) {
      onChange([...selected, settlement]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (settlement: string) => {
    onChange(selected.filter((s) => s !== settlement));
  };

  // In single-select mode, if a settlement is selected, show it nicely with a clear button
  if (singleSelect && selected.length > 0 && selected[0]) {
    const current = selected[0];
    return (
      <div className={`relative w-full ${className}`} ref={containerRef}>
        <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-200 rounded-xl px-3 py-2 text-sm text-indigo-950 font-medium">
          <span className="truncate">{current}</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-indigo-400 hover:text-indigo-700 p-0.5 rounded-md hover:bg-indigo-100 transition-colors"
            title="נקה בחירה"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {!singleSelect && selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((settlement) => (
            <span
              key={settlement}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
            >
              {settlement}
              <button
                type="button"
                onClick={() => handleRemove(settlement)}
                className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      {(singleSelect || selected.length < maxSelections) && (
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
          />
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto">
          {suggestions.map((item) => (
            <button
              type="button"
              key={item.settlement}
              className="w-full text-right px-4 py-2 hover:bg-indigo-50/60 flex justify-between items-center focus:outline-none focus:bg-indigo-50/80 transition-colors border-b border-slate-50 last:border-b-0"
              onClick={() => handleSelect(item.settlement)}
            >
              <span className="text-sm font-medium text-slate-800">{item.settlement}</span>
              <span className="text-xs text-slate-400">
                {item.deals.toLocaleString('he-IL')} עסקאות
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
