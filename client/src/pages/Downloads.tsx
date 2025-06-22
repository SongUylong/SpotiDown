import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { MusicNote } from '@mui/icons-material';
import axios from 'axios';

interface DownloadedFile {
  name: string;
}

const Downloads = () => {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('/api/download/files');
        setFiles(response.data.files.map((filename: string) => ({ name: filename })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch downloaded files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleDownload = async (filename: string) => {
    try {
      const response = await axios.get(`/api/download/files/${filename}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Downloaded Songs
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3}>
        {files.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No downloaded songs found
            </Typography>
          </Box>
        ) : (
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                onClick={() => handleDownload(file.name)}
                divider={index < files.length - 1}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>
                  <MusicNote />
                </ListItemIcon>
                <ListItemText primary={file.name.replace('.mp3', '')} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Downloads; 