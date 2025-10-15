import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Login as MicrosoftIcon } from '@mui/icons-material';
import { useAppContext } from '../App';

function Login() {
  const { setIsAdmin, setIsAuthenticated, setUser, showNotification } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('✅ User data received:', data.user);
            
            setUser({
              uid: data.user.id,
              username: data.user.name,
              email: data.user.email,
              role: data.user.role,
              authProvider: data.user.authProvider,
            });
            setIsAuthenticated(true);
            setIsAdmin(data.user.role === 'Admin');

            if (data.user.role === 'Admin') {
              navigate('/admin');
            } else {
              navigate('/user');
            }
            
            const firstName = data.user.name.split(' ')[0];
            showNotification(`Welcome back, ${firstName}!`, 'success');
          } else {
            setChecking(false);
          }
        } else {
          setChecking(false);
        }
      } catch (error) {
        console.log('Not authenticated, showing login form');
        setChecking(false);
      }
    };

    checkAuth();
  }, [navigate, setIsAdmin, setIsAuthenticated, setUser, showNotification]);

  const handleLogin = () => {
    if (!username || !password) {
      showNotification('Please enter both username and password', 'error');
      return;
    }

    if (username === 'admin' && password === 'admin123') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      setUser({ uid: 'admin', username: 'Admin' });
      navigate('/admin');
      showNotification('Logged in as Admin', 'success');
    } else {
      setIsAdmin(false);
      setIsAuthenticated(true);
      setUser({ uid: username, username: username || 'User' });
      navigate('/user');
      showNotification(`Logged in as ${username || 'User'}`, 'success');
    }
  };

  const handleMicrosoftLogin = () => {
    window.location.href = 'http://localhost:5000/auth/microsoft';
  };

  const handleForgotPassword = () => {
    showNotification('Forgot Password functionality is not implemented yet.', 'info');
  };

  if (checking) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Checking authentication...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 400,
          borderRadius: 3,
          transition: 'transform 0.3s',
          '&:hover': { transform: 'scale(1.03)' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img
            src="/erni-logo.png"
            alt="ERNI Logo"
            style={{ height: '60px', objectFit: 'contain' }}
            onError={(e) => (e.target.style.display = 'none')}
          />
        </Box>

        <Typography
          variant="h4"
          sx={{ textAlign: 'center', fontWeight: 'bold', mb: 3 }}
        >
          Reimbursement Tool
        </Typography>

        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: 2 }}
          variant="outlined"
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ mb: 1 }}
          variant="outlined"
        />

        <Link
          component="button"
          variant="body2"
          onClick={handleForgotPassword}
          sx={{
            color: 'primary.main',
            mb: 2,
            display: 'block',
            textAlign: 'left',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Forgot Password?
        </Link>

        <Button
          variant="contained"
          onClick={handleLogin}
          color="secondary"
          sx={{ width: 128, mx: 'auto', display: 'block', mb: 2 }}
        >
          Login
        </Button>

        <Divider sx={{ my: 2 }}>or</Divider>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<MicrosoftIcon />}
          onClick={handleMicrosoftLogin}
          sx={{
            textTransform: 'none',
            fontWeight: 'bold',
            borderColor: '#2F2F2F',
            color: '#2F2F2F',
            backgroundColor: '#fff',
            '&:hover': {
              borderColor: '#0078D4',
              backgroundColor: 'rgba(0,120,212,0.1)',
              color: '#0078D4',
            },
          }}
        >
          Sign in with Microsoft
        </Button>
      </Paper>
    </Container>
  );
}

export default Login;