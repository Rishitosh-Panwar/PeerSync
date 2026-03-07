import React, { useEffect, useRef, useState } from 'react';

const PeerSyncVideo = ({ roomName, userName }) => {
    const jitsiContainer = useRef(null);
    const [captions, setCaptions] = useState("");

    useEffect(() => {
        // Initialize Jitsi Conference
        const domain = "meet.jit.si";
        const options = {
            roomName: roomName || "PeerSync-Global-Lab",
            width: "100%",
            height: "600px",
            parentNode: jitsiContainer.current,
            userInfo: { displayName: userName || "Student" },
            configOverwrite: {
                startWithAudioMuted: true,
                disableDeepLinking: true, // Prevents mobile app redirects
            },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        // --- HINDI TO ENGLISH CAPTIONS LOGIC ---
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.lang = 'hi-IN'; // Listening for Hindi

            recognition.onresult = async (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                
                // Translate Hindi text to English using MyMemory (Free, no key needed for low volume)
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(transcript)}&langpair=hi|en`);
                const data = await res.json();
                setCaptions(data.responseData.translatedText);
            };
            recognition.start();
        }

        return () => api.dispose();
    }, [roomName, userName]);

    return (
        <div className="video-layout">
            <div ref={jitsiContainer} style={{ borderRadius: '10px', overflow: 'hidden' }} />
            <div className="caption-box" style={{ background: '#000', color: '#fff', padding: '10px', marginTop: '10px' }}>
                <strong>Live Translation (En):</strong> {captions || "Waiting for speech..."}
            </div>
        </div>
    );
};

export default PeerSyncVideo;