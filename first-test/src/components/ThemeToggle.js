import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useAppContext } from '../App';

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useAppContext();

  return (
    <Tooltip title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
      <IconButton 
        onClick={toggleTheme} 
        color="inherit"
        sx={{
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'rotate(180deg)',
          },
        }}
      >
        {darkMode ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;