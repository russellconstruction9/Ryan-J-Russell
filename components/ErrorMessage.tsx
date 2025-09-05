
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';

interface ErrorMessageProps {
  message: string;
  onReset: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onReset }) => {
  return (
    <div className="flex flex-col items-center justify-center h-80 text-center p-4 bg-red-50 rounded-lg border border-red-200">
      <XCircleIcon className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800">An Error Occurred</h3>
      <p className="mt-2 max-w-md text-sm text-red-700">{message}</p>
      <button
        onClick={onReset}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Try Again
      </button>
    </div>
  );
};
