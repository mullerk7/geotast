import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass, icon }) => {
  return (
    <div className="relative p-5 rounded-sm border-l-4 border-red-600 bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 shadow-2xl hover:bg-neutral-800 transition-all duration-300 group overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-600/10 to-transparent rounded-bl-full -mr-10 -mt-10"></div>
      
      <div className={`p-3 rounded-none bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] transform group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold z-10">{label}</p>
      <p className="text-xl md:text-3xl font-black text-white text-center font-mono z-10 tracking-tight">
        {value}
      </p>
    </div>
  );
};

export default StatCard;