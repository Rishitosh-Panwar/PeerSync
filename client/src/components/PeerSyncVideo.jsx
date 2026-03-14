import React, { useEffect, useRef, useState } from 'react';

const PeerSyncVideo = ({ roomName, userName }) => {
    const jitsiContainer = useRef(null);
    const [captions, setCaptions] = useState("");
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const stopFlag = useRef(false);

    // --- NEW: Invite Friend Logic ---
    const handleInvite = () => {
        const inviteUrl = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'Join my PeerSync Lab',
                text: `Join my 5-hour collaborative session: ${roomName}`,
                url: inviteUrl,
            });
        } else {
            navigator.clipboard.writeText(inviteUrl);
            alert("Invite link copied to clipboard!");
        }
    };

    useEffect(() => {
        stopFlag.current = false;
        const domain = "meet.jit.si";
        const options = {
            roomName: roomName || "PeerSync-Default-Lab",
            width: "100%",
            height: "550px",
            parentNode: jitsiContainer.current,
            userInfo: { displayName: userName || "Student" },
            configOverwrite: {
                startWithAudioMuted: true,
                disableThirdPartyRequests: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'chat', 'raisehand'],
            },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            const rec = recognitionRef.current;
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'hi-IN';

            rec.onstart = () => setIsListening(true);
            rec.onresult = async (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                if (event.results[event.results.length - 1].isFinal) {
                    try {
                        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(transcript)}&langpair=hi|en`);
                        const data = await res.json();
                        if (data.responseData) setCaptions(data.responseData.translatedText);
                    } catch (err) { console.error("Translation Error:", err); }
                }
            };

            rec.onend = () => {
                if (!stopFlag.current) rec.start();
            };
            rec.start();
        }

        return () => {
            stopFlag.current = true;
            if (api) api.dispose();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [roomName, userName]);

    return (
        <div className="video-section">
            <div className="invite-bar">
                <span>Room: <strong>{roomName}</strong></span>
                <button onClick={handleInvite} className="invite-btn">👤 Invite Friend</button>
            </div>
            <div ref={jitsiContainer} className="jitsi-frame" />
            <div className="caption-container">
                <p className={`status ${isListening ? 'live' : 'off'}`}>
                    ● {isListening ? "LIVE SUBTITLES" : "MIC OFF"}
                </p>
                <p className="caption-text">{captions || "Awaiting Hindi speech..."}</p>
            </div>
            <style>{`
                .invite-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #222; color: #fff; border-radius: 8px 8px 0 0; }
                .invite-btn { background: #007bff; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                .jitsi-frame { border: 2px solid #333; border-top: none; overflow: hidden; }
                .caption-container { background: #1a1a1a; color: white; padding: 15px; border-radius: 0 0 8px 8px; border-left: 4px solid #00ff00; }
                .status.live { color: #00ff00; }
                .status.off { color: #ff4444; }
                .caption-text { font-size: 1.1rem; }
            `}</style>
        </div>
    );
};

export default PeerSyncVideo;