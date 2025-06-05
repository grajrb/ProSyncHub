import '@testing-library/jest-dom';
import './mocks/mockModules';

// Mock for matchMedia (required for some UI components)
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return true; }
  };
};
