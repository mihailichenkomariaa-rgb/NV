
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  // Common styles: rounded, bold, transition. REMOVED active:scale-95
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    // Primary: Blue solid
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none",
    // Secondary: White with border
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm disabled:opacity-50",
    // Danger: Red solid
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200 disabled:opacity-50",
    // Ghost: Transparent blue text
    ghost: "bg-transparent hover:bg-blue-50 text-blue-600 disabled:opacity-50"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Загрузка...
        </>
      ) : children}
    </button>
  );
};

export default Button;
