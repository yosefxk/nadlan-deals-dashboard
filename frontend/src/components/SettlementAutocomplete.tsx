import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { autocomplete } from '../api';

interface Props {
  selected: string[];
  onChange: (settlements: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
}

export default function SettlementAutocomplete({
  selected,
  onChange,
  maxSelections = 5,
  placeholder = 'חפש יישוב...',
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
    if (selected.length < maxSelections && !selected.includes(settlement)) {
      onChange([...selected, settlement]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (settlement: string) => {
    onChange(selected.filter((s) => s !== settlement));
  };

  const unselectedSuggestions = suggestions.filter((s) => !selected.includes(s.settlement));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((settlement) => (
          <span
            key={settlement}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
          >
            {settlement}
            <button
              onClick={() => handleRemove(settlement)}
              className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      {selected.length < maxSelections && (
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
      {isOpen && unselectedSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {unselectedSuggestions.map((item) => (
            <button
              key={item.settlement}
              className="w-full text-right px-4 py-2 hover:bg-slate-50 flex justify-between items-center focus:outline-none focus:bg-slate-50"
              onClick={() => handleSelect(item.settlement)}
            >
              <span className="text-sm font-medium text-slate-700">{item.settlement}</span>
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
