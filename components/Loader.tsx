
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-80 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-slate-600 font-medium">Analyzing your estimate...</p>
      <p className="text-slate-500 text-sm">This may take a moment.</p>
    </div>
  );
};
