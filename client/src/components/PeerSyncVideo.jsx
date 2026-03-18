import React, { useEffect, useRef, useState } from 'react';

const PeerSyncVideo = ({ roomName, userName }) => {
    const jitsiContainer = useRef(null);
    const [captions, setCaptions] = useState({ original: "", translated: "" });
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const stopFlag = useRef(false);

    // --- Helper: Bilingual Translator ---
    const translateBilingual = async (text) => {
        try {
            // We detect if the input is mostly Hindi or English
            const isEnglish = /^[a-zA-Z0-9\s,.'?]+$/.test(text);
            const langPair = isEnglish ? "en|hi" : "hi|en";
            
            const res = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
            );
            const data = await res.json();
            
            if (data.responseData) {
                setCaptions({
                    original: text,
                    translated: data.responseData.translatedText
                });
            }
        } catch (err) {
            console.error("Bilingual Translation Error:", err);
        }
    };

    useEffect(() => {
        stopFlag.current = false;
        const domain = "meet.jit.si";
        const options = {
            roomName: roomName || "PeerSync-Lab",
            width: "100%",
            height: "500px",
            parentNode: jitsiContainer.current,
            userInfo: { displayName: userName || "Student" },
            configOverwrite: { startWithAudioMuted: true },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            const rec = recognitionRef.current;
            rec.continuous = true;
            rec.interimResults = true;
            // 'hi-IN' also captures English technical terms effectively
            rec.lang = 'hi-IN'; 

            rec.onstart = () => setIsListening(true);
            rec.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                if (event.results[event.results.length - 1].isFinal) {
                    translateBilingual(transcript);
                } else {
                    // Show interim results in the 'original' slot
                    setCaptions(prev => ({ ...prev, original: transcript }));
                }
            };

            rec.onend = () => { if (!stopFlag.current) rec.start(); };
            
            // Sync with Jitsi Mute
            api.addEventListener('audioMuteStatusChanged', (e) => {
                e.muted ? rec.stop() : rec.start();
            });
        }

        return () => {
            stopFlag.current = true;
            api.dispose();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [roomName, userName]);

    return (
        <div className="video-section">
            <div ref={jitsiContainer} className="jitsi-frame" />
            
            <div className="dual-caption-container">
                <div className="caption-header">
                    <span className={`dot ${isListening ? 'live' : ''}`}></span>
                    {isListening ? "BILINGUAL LIVE" : "MIC MUTED"}
                </div>
                
                <div className="caption-grid">
                    <div className="caption-block original">
                        <label>Detected</label>
                        <p>{captions.original || "Waiting for speech..."}</p>
                    </div>
                    <div className="caption-block translated">
                        <label>Translation</label>
                        <p>{captions.translated || "..."}</p>
                    </div>
                </div>
            </div>

            <style>{`
                .jitsi-frame { border: 2px solid #333; border-radius: 8px 8px 0 0; overflow: hidden; }
                .dual-caption-container { 
                    background: #111; 
                    padding: 15px; 
                    border-radius: 0 0 8px 8px; 
                    border: 2px solid #333;
                    border-top: none;
                }
                .caption-header { 
                    font-size: 10px; 
                    color: #888; 
                    margin-bottom: 10px; 
                    display: flex; 
                    align-items: center; 
                    gap: 5px;
                    text-transform: uppercase;
                }
                .dot { width: 8px; height: 8px; background: #444; border-radius: 50%; }
                .dot.live { background: #00ff00; box-shadow: 0 0 5px #00ff00; }
                
                .caption-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .caption-block { background: #1a1a1a; padding: 10px; border-radius: 5px; min-height: 60px; border-left: 3px solid #444; }
                .caption-block label { font-size: 9px; color: #555; display: block; margin-bottom: 4px; }
                .caption-block p { font-size: 14px; color: #fff; margin: 0; line-height: 1.4; }
                
                .original { border-left-color: #007bff; }
                .translated { border-left-color: #ffc107; }
            `}</style>
        </div>
    );
};

export default PeerSyncVideo;