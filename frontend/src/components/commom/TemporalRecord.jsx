import React from 'react';

/**
 * Componente Universal de Registro Temporal
 *
 * @param {string | Date | null} completedAt - Data/hora em que a ação foi realizada.
 * @param {boolean} [showIcon=true] - Se deve exibir o ícone '✓'.
 * @param {string} [className] - Classes CSS adicionais.
 */
export const TemporalRecord = ({ completedAt, showIcon = true, className = '' }) => {
  if (!completedAt) return null;

  const dateObj = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;

  if (isNaN(dateObj.getTime())) return null;

  const formattedTime = dateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`text-xs text-gray-500 text-center mt-1 select-none ${className}`}>
      {showIcon && <span className="mr-1 text-emerald-600 font-medium">✓</span>}
      <span>Realizado às: {formattedTime}</span>
    </div>
  );
};

export default TemporalRecord;