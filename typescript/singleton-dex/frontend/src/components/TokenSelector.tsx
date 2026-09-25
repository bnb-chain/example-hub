import { useEffect, useRef, useState } from 'react';
import { TokenInfo } from '../hooks/useTokenList';

interface TokenSelectorProps {
    selected: TokenInfo | null;
    tokens: TokenInfo[];
    onSelect: (token: TokenInfo) => void;
    placeholder?: string;
}

export function TokenSelector({
    selected,
    tokens,
    onSelect,
    placeholder = 'Select'
}: TokenSelectorProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (token: TokenInfo) => {
        onSelect(token);
        setOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full flex items-center gap-2 font-bold transition-all min-w-[120px] justify-center border border-white/10"
            >
                {selected ? (
                    <>
                        {selected.logo
                            ? <img src={selected.logo} className="w-6 h-6 rounded-full" alt={selected.symbol} />
                            : <div className="w-6 h-6 rounded-full bg-yellow-500" />
                        }
                        {selected.symbol}
                    </>
                ) : (
                    <span className="text-xs">{placeholder}</span>
                )}
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1b23] border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {tokens.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400">No tokens found</div>
                    ) : tokens.map((token) => (
                        <button
                            key={token.address}
                            type="button"
                            onClick={() => handleSelect(token)}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-sm"
                        >
                            {token.logo
                                ? <img src={token.logo} className="w-6 h-6 rounded-full" alt={token.symbol} />
                                : <div className="w-6 h-6 rounded-full bg-yellow-500" />
                            }
                            <div className="flex flex-col">
                                <span className="font-semibold">{token.symbol}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-wide">{token.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
