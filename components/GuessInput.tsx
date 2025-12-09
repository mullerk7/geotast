import React, { useState, useEffect, useRef } from 'react';
import { COUNTRIES } from '../constants';
import { Language } from '../types';

interface GuessInputProps {
  onGuess: (countryName: string) => void;
  disabled: boolean;
  feedback: 'idle' | 'success' | 'error';
  language: Language;
  placeholder: string;
  selectText: string;
  waitText: string;
}

const GuessInput: React.FC<GuessInputProps> = ({ 
  onGuess, 
  disabled, 
  feedback, 
  language,
  placeholder,
  selectText,
  waitText
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper function to remove accents/diacritics and convert to lowercase
  const normalize = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const getCountryName = (c: any) => language === 'en' ? c.name_en : c.name;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (value.length > 0) {
      const normalizedInput = normalize(value);
      const filtered = COUNTRIES
        .map(c => getCountryName(c))
        .filter(name => normalize(name).includes(normalizedInput))
        .sort();
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (name: string) => {
    setInput(name);
    setShowSuggestions(false);
    onGuess(name);
    setInput(''); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const normalizedInput = normalize(input);

      // 1. Exact match (case insensitive & accent insensitive)
      const exactMatch = COUNTRIES.find(c => normalize(getCountryName(c)) === normalizedInput);
      if (exactMatch) {
        handleSelect(getCountryName(exactMatch));
        return;
      }

      // 2. If there is exactly one suggestion visible, select it
      if (suggestions.length === 1) {
        handleSelect(suggestions[0]);
        return;
      }
    }
  };

  // Determine border styles based on feedback status
  let borderClass = "border-red-900/50 focus:border-red-600"; // Default
  let animationClass = "";

  if (feedback === 'success') {
    borderClass = "border-green-500 bg-green-900/20 text-green-400";
  } else if (feedback === 'error') {
    borderClass = "border-red-600 bg-red-900/20 text-red-500";
    animationClass = "animate-[shake_0.5s_ease-in-out]";
  }

  return (
    <div className={`relative w-full max-w-md mx-auto ${animationClass}`} ref={wrapperRef}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
        placeholder={disabled ? waitText : placeholder}
        className={`w-full px-6 py-4 bg-black/50 border-2 rounded-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all text-lg font-mono uppercase shadow-inner disabled:opacity-50 disabled:cursor-not-allowed tracking-wider ${borderClass}`}
      />
      
      {showSuggestions && suggestions.length > 0 && feedback === 'idle' && (
        <ul className="absolute z-50 w-full mt-1 bg-neutral-900 border border-red-900 rounded-sm shadow-[0_0_20px_rgba(220,38,38,0.2)] max-h-60 overflow-y-auto overflow-x-hidden">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className="px-6 py-3 hover:bg-red-700 cursor-pointer text-white transition-colors border-b border-red-900/30 last:border-none flex items-center justify-between group"
            >
              <span className="font-bold tracking-wide">{suggestion}</span>
              <span className="text-red-500 group-hover:text-white text-xs uppercase font-mono">{selectText}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GuessInput;