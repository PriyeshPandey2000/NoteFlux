import React from 'react';

const GridBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900 via-black to-emerald-900 z-0" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 z-10 opacity-40">
        <div className="h-full w-full grid-background" />
      </div>
      
      {/* Content */}
      <div className="relative z-20 min-h-screen w-full">
        {children}
      </div>
    </div>
  );
};

export default GridBackground; 