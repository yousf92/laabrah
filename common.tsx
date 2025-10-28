
import React from 'react';

export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg text-sm">{message}</p>
);
