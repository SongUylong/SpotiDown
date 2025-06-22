const SpotifyWebApi = require('spotify-web-api-node');
const config = require('../config');

class SpotifyService {
    constructor() {
        this.api = new SpotifyWebApi({
            clientId: config.spotify.clientId,
            clientSecret: config.spotify.clientSecret,
        });
    }

    async authenticate() {
        try {
            const data = await this.api.clientCredentialsGrant();
            this.api.setAccessToken(data.body['access_token']);
        } catch (err) {
            console.error('Spotify authentication failed:', err.message);
            throw new Error('Failed to authenticate with Spotify');
        }
    }

    extractPlaylistId(url) {
        const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    // Extract track ID from Spotify track URL
    extractTrackId(url) {
        const match = url.match(/track\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    // Get single track information
    async getTrackInfo(trackId) {
        try {
            const { body } = await this.api.getTrack(trackId);
            return {
                name: body.name,
                artist: body.artists.map((artist) => artist.name).join(' '),
                album: body.album.name,
                duration: body.duration_ms,
                id: body.id
            };
        } catch (err) {
            console.error('Failed to fetch Spotify track:', err.message);
            throw new Error('Failed to fetch track information');
        }
    }

    async getPlaylistTracks(playlistId) {
        try {
            const allTracks = [];
            let offset = 0;
            const limit = 100; // Maximum allowed by Spotify API
            let hasMore = true;

            console.log(`Fetching playlist tracks for playlist: ${playlistId}`);

            while (hasMore) {
                console.log(`Fetching tracks ${offset + 1} to ${offset + limit}...`);
                
                const { body } = await this.api.getPlaylistTracks(playlistId, {
                    offset: offset,
                    limit: limit,
                    fields: 'items(track(name,artists,id)),total,offset,limit'
                });

                // Filter out null tracks (tracks that might be unavailable)
                const validTracks = body.items
                    .filter(item => item.track && item.track.name && item.track.artists)
                    .map((item) => ({
                        name: item.track.name,
                        artist: item.track.artists.map((artist) => artist.name).join(' '),
                        id: item.track.id
                    }));

                allTracks.push(...validTracks);

                console.log(`Fetched ${validTracks.length} valid tracks (total so far: ${allTracks.length})`);

                // Check if there are more tracks to fetch
                hasMore = body.offset + body.items.length < body.total;
                offset += limit;

                // Small delay to respect rate limits
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log(`✅ Successfully fetched all ${allTracks.length} tracks from playlist`);
            return allTracks;

        } catch (err) {
            console.error('Failed to fetch Spotify playlist tracks:', err.message);
            throw new Error('Failed to fetch playlist tracks');
        }
    }

    // Get playlist information (name, description, total tracks, etc.)
    async getPlaylistInfo(playlistId) {
        try {
            const { body } = await this.api.getPlaylist(playlistId, {
                fields: 'name,description,tracks.total,owner.display_name,public,followers.total'
            });
            
            return {
                name: body.name,
                description: body.description,
                totalTracks: body.tracks.total,
                owner: body.owner.display_name,
                isPublic: body.public,
                followers: body.followers.total
            };
        } catch (err) {
            console.error('Failed to fetch Spotify playlist info:', err.message);
            throw new Error('Failed to fetch playlist information');
        }
    }
}

module.exports = new SpotifyService(); 