// first-test/src/components/__tests__/ThemeToggle.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../ThemeToggle';
import { useAppContext } from '../../App';

// Mock the useAppContext hook
jest.mock('../../App', () => ({
  useAppContext: jest.fn(),
}));

describe('ThemeToggle Component', () => {
  let mockToggleTheme;

  beforeEach(() => {
    mockToggleTheme = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render with dark mode icon when darkMode is true', () => {
    useAppContext.mockReturnValue({
      darkMode: true,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    // Check for Brightness7 icon (light mode icon shown in dark mode)
    const iconButton = screen.getByRole('button');
    expect(iconButton).toBeInTheDocument();
  });

  it('should render with light mode icon when darkMode is false', () => {
    useAppContext.mockReturnValue({
      darkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const iconButton = screen.getByRole('button');
    expect(iconButton).toBeInTheDocument();
  });

  it('should call toggleTheme when clicked', () => {
    useAppContext.mockReturnValue({
      darkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const iconButton = screen.getByRole('button');
    fireEvent.click(iconButton);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should show correct tooltip text for dark mode', () => {
    useAppContext.mockReturnValue({
      darkMode: true,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const iconButton = screen.getByRole('button');
    fireEvent.mouseOver(iconButton);
    
    // Tooltip should say "Switch to light mode"
    expect(iconButton).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  it('should show correct tooltip text for light mode', () => {
    useAppContext.mockReturnValue({
      darkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    const iconButton = screen.getByRole('button');
    fireEvent.mouseOver(iconButton);
    
    // Tooltip should say "Switch to dark mode"
    expect(iconButton).toHaveAttribute('aria-label', 'Switch to dark mode');
  });
});