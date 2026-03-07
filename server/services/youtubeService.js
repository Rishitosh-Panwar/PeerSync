const axios = require('axios');

const getYTRecommendations = async (topic) => {
    const API_KEY = process.env.YT_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${topic}+tutorial&type=video&maxResults=1&key=${API_KEY}`;
    
    const response = await axios.get(url);
    const video = response.data.items[0];
    
    return {
        title: video.snippet.title,
        link: `https://www.youtube.com/watch?v={video.id.videoId}`,
        channel: video.snippet.channelTitle
    };
};