export function NorthArrow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`} title="Nord">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="14,2 20,20 14,16 8,20" fill="#e2e8f0" stroke="#475569" strokeWidth="1"/>
        <polygon points="14,2 8,20 14,16 20,20" fill="#475569" stroke="#475569" strokeWidth="1"/>
        <circle cx="14" cy="20" r="3" fill="#475569"/>
      </svg>
      <span className="text-[10px] font-bold text-slate-200 -mt-1">N</span>
    </div>
  );
}
