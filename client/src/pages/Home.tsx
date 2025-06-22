import { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

const Home = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('/api/download', { playlistUrl }, {
        responseType: 'blob'
      });

      // Create a download link for the zip file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'playlist.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while downloading the playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Download Spotify Playlists
      </Typography>
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 600, 
          width: '100%' 
        }}
      >
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Spotify Playlist URL"
            variant="outlined"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/..."
            disabled={loading}
            sx={{ mb: 2 }}
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !playlistUrl}
            sx={{ height: 48 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Download Playlist'
            )}
          </Button>
        </form>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Typography variant="body2" color="text.secondary" align="center">
        Enter a Spotify playlist URL to download all songs as MP3 files
      </Typography>
    </Box>
  );
};

export default Home; 