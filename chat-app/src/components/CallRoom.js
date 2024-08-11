import React, { useState, useEffect, useRef } from 'react';
import '../styles/CallRoom.css';

const signalingServerUrl = 'ws://localhost:8080'; // Replace with your signaling server URL

export const CallRoom = ({ roomId, onEndCall }) => {
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({}); // Store peer connections
    const [screenStream, setScreenStream] = useState(null);
    const localVideoRef = useRef(null);
    const videoContainerRef = useRef(null);

    useEffect(() => {
        const setupStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                const signalingConnection = new WebSocket(signalingServerUrl);

                signalingConnection.onmessage = async (message) => {
                    const data = JSON.parse(message.data);
                    switch (data.type) {
                        case 'offer':
                            handleOffer(data.offer, data.fromId, signalingConnection);
                            break;
                        case 'answer':
                            handleAnswer(data.answer, data.fromId);
                            break;
                        case 'candidate':
                            handleCandidate(data.candidate, data.fromId);
                            break;
                        case 'join':
                            handleNewParticipant(data.fromId, signalingConnection);
                            break;
                        default:
                            console.log('Unknown message type:', data.type);
                            break;
                    }
                };

                signalingConnection.onopen = () => {
                    signalingConnection.send(JSON.stringify({ type: 'join', roomId }));
                };

                return () => {
                    signalingConnection.close();
                };
            } catch (error) {
                console.error('Error accessing media devices or setting up WebRTC:', error);
            }
        };

        setupStream();

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            Object.values(peers).forEach(pc => pc.close());
        };
    }, [roomId, peers]);

    const handleOffer = async (offer, fromId, signalingConnection) => {
        const peerConnection = new RTCPeerConnection();
        setPeers(prevPeers => ({ ...prevPeers, [fromId]: peerConnection }));

        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            const existingVideo = document.querySelector(`[data-id="${fromId}"]`);
            if (existingVideo) {
                existingVideo.srcObject = remoteStream;
            } else {
                const remoteVideo = document.createElement('video');
                remoteVideo.autoplay = true;
                remoteVideo.srcObject = remoteStream;
                remoteVideo.dataset.id = fromId;
                videoContainerRef.current.appendChild(remoteVideo);
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingConnection.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, toId: fromId }));
            }
        };

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingConnection.send(JSON.stringify({ type: 'answer', answer, toId: fromId }));
    };

    const handleAnswer = async (answer, fromId) => {
        const peerConnection = peers[fromId];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleCandidate = async (candidate, fromId) => {
        const peerConnection = peers[fromId];
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleNewParticipant = async (fromId, signalingConnection) => {
        // Create a new peer connection for the new participant
        const peerConnection = new RTCPeerConnection();
    
        // Add the new peer connection to the state
        setPeers(prevPeers => ({ ...prevPeers, [fromId]: peerConnection }));
    
        // Handle incoming media streams
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            const existingVideo = document.querySelector(`[data-id="${fromId}"]`);
            if (existingVideo) {
                existingVideo.srcObject = remoteStream;
            } else {
                // Create a new video element for the new participant
                const remoteVideo = document.createElement('video');
                remoteVideo.autoplay = true;
                remoteVideo.srcObject = remoteStream;
                remoteVideo.dataset.id = fromId;
                videoContainerRef.current.appendChild(remoteVideo);
            }
        };
    
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                signalingConnection.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    toId: fromId
                }));
            }
        };
    
        // Add local tracks to the new peer connection
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
        // Create an offer and send it to the new participant
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        signalingConnection.send(JSON.stringify({
            type: 'offer',
            offer,
            toId: fromId
        }));
    };
    

    const handleMute = () => {
        localStream?.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    };

    const handleCameraToggle = () => {
        localStream?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    };

    const handleFullScreen = () => {
        if (document.documentElement.requestFullscreen) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    };

    const handleScreenShare = async () => {
        try {
            if (!screenStream) {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setScreenStream(stream);
                Object.values(peers).forEach(pc => {
                    stream.getTracks().forEach(track => pc.addTrack(track, stream));
                });
            } else {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
                Object.values(peers).forEach(pc => {
                    pc.getSenders().forEach(sender => {
                        if (sender.track && sender.track.kind === 'video') {
                            pc.removeTrack(sender);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    return (
        <div className="call-room">
            <div className="video-container" ref={videoContainerRef}>
                <video ref={localVideoRef} autoPlay muted className="local-video" />
                {/* Remote videos will be appended dynamically */}
            </div>
            <div className="controls">
                <button onClick={handleMute}>Mute</button>
                <button onClick={handleCameraToggle}>ON/OFF</button>
                <button onClick={handleFullScreen}>Fullscreen</button>
                <button onClick={handleScreenShare}>{screenStream ? 'Stop Sharing' : 'Share Screen'}</button>
                <button onClick={onEndCall}>End Call</button>
            </div>
        </div>
    );
};
