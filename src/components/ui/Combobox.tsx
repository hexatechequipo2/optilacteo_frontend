import {
  useState,
  useRef,
  useEffect,
  useId,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { ChevronDown, X } from "lucide-react";

interface ComboboxProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
}

const MAX_VISIBLE = 60;

export function Combobox({
  id,
  label,
  placeholder = "Buscar...",
  value,
  onChange,
  options,
  error,
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sincroniza el texto del input cuando el valor externo cambia
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = options
    .filter((opt) => opt.toLowerCase().includes(query.toLowerCase()))
    .slice(0, MAX_VISIBLE);

  const select = (option: string) => {
    onChange(option);
    setQuery(option);
    setIsOpen(false);
    setHighlighted(0);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlighted(0);
    // Si el usuario borra todo, limpia el valor seleccionado
    if (!e.target.value) onChange("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") setIsOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(value); // restaura el valor anterior
    }
  };

  // Scroll automático al ítem destacado
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  // Cierra al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(value); // restaura si salió sin seleccionar
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-md border px-3 py-2 pr-8 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-slate-300"
          }`}
        />

        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
          {value && !isOpen ? (
            <button
              type="button"
              className="pointer-events-auto"
              onClick={clear}
              tabIndex={-1}
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                No se encontraron localidades
              </li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option}
                  role="option"
                  aria-selected={option === value}
                  onMouseDown={() => select(option)}
                  onMouseEnter={() => setHighlighted(index)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    index === highlighted
                      ? "bg-blue-50 text-blue-700"
                      : option === value
                        ? "bg-slate-50 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
