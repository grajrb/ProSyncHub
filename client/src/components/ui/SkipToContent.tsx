import React, { useState } from 'react';

/**
 * Accessibility component that allows keyboard users to skip to the main content
 * This component should be placed at the very beginning of your layout
 */
export default function SkipToContent() {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  
  const handleClick = () => {
    // Find the main content element by id
    const mainContent = document.getElementById('main-content');
    
    if (mainContent) {
      // Set focus to the main content
      mainContent.focus();
      // Scroll to the main content
      mainContent.scrollIntoView();
    }
  };

  return (
    <a
      href="#main-content"
      className={`
        fixed top-0 left-0 z-50 p-3 m-3 text-sm font-medium text-white 
        bg-primary-600 rounded transition-transform duration-200 
        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
        ${isFocused ? 'transform-none' : '-translate-y-full'}
      `}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
    >
      Skip to content
    </a>
  );
}
