import { useState, useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';
import { autocompleteStreets } from '../api';

interface Props {
  value: string;
  onChange: (street: string) => void;
  onSelect?: (street: string, selectedCity?: string) => void;
  settlements?: string[];
  placeholder?: string;
  className?: string;
}

export default function StreetAutocomplete({
  value,
  onChange,
  onSelect,
  settlements = [],
  placeholder,
  className = '',
}: Props) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<{ street_name: string; city_name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await autocompleteStreets(query.trim(), settlements);
        setSuggestions(res.data || []);
        setIsOpen((res.data || []).length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Error fetching street suggestions', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, settlements]);

  const handleSelect = (street: string, city: string) => {
    setQuery(street);
    if (onSelect) {
      onSelect(street, city);
    } else {
      onChange(street);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    if (onSelect) {
      onSelect('', '');
    }
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const item = suggestions[highlightedIndex];
        handleSelect(item.street_name, item.city_name);
      } else {
        onChange(query);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Compute dynamic placeholder based on inherited settlements
  const dynamicPlaceholder = placeholder || (
    settlements.length === 1
      ? `חפש רחוב ב${settlements[0]}...`
      : settlements.length > 1
      ? `חפש רחוב ב-${settlements.length} הערים שנבחרו...`
      : 'הקלד שם רחוב...'
  );

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} dir="rtl">
      <div className="relative">
        <input
          type="text"
          dir="rtl"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          className="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm text-right placeholder:text-slate-400 font-medium transition-colors"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
            title="נקה רחוב"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
          {settlements.length > 0 && (
            <div className="px-3 py-1.5 bg-indigo-50/70 text-[11px] font-semibold text-indigo-700 border-b border-indigo-100/60 flex items-center justify-between">
              <span>רחובות מותאמים לעיר/ים שנבחרו</span>
              <span className="text-indigo-500">{suggestions.length} תוצאות</span>
            </div>
          )}
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={`${item.city_name}-${item.street_name}-${idx}`}
                type="button"
                className={`w-full px-3 py-2 text-right text-xs transition-colors flex items-center justify-between gap-2 ${
                  isHighlighted ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(item.street_name, item.city_name);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(item.street_name, item.city_name);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={13} className={isHighlighted ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>{item.street_name}</span>
                </div>
                {/* Show city tag if multiple or no settlements are selected */}
                {(settlements.length !== 1 || settlements[0] !== item.city_name) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-normal border border-slate-200/60">
                    {item.city_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
