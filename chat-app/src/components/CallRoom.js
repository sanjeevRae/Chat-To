import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "../styles/CallRoom.css";

const CallRoom = ({ roomId, onEndCall }) => {
  const [peerConnections, setPeerConnections] = useState({});
  const [streams, setStreams] = useState([]);
  const localVideoRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socket.current = io("http://localhost:5000"); // Replace with your signaling server URL
    socket.current.emit("join-room", roomId);

    // Initialize local media stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        socket.current.emit("new-stream", { roomId, streamId: stream.id });
        
        // Add local stream to peer connections
        socket.current.on("new-peer", (peerId) => {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          pc.addStream(stream);
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.current.emit("send-ice-candidate", {
                roomId,
                peerId,
                candidate: event.candidate,
              });
            }
          };

          pc.onaddstream = (event) => {
            setStreams((prevStreams) => [...prevStreams, event.stream]);
          };

          setPeerConnections((prevConnections) => ({
            ...prevConnections,
            [peerId]: pc,
          }));

          // Handle incoming offers
          socket.current.on("receive-offer", async (offer) => {
            if (offer.peerId === peerId) {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.current.emit("send-answer", { roomId, peerId, answer });
            }
          });

          // Handle incoming answers
          socket.current.on("receive-answer", async (answer) => {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          });

          // Handle ICE candidates
          socket.current.on("receive-ice-candidate", async (candidate) => {
            if (candidate.peerId === peerId) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          });
        });
      });

    // Cleanup on component unmount
    return () => {
      Object.values(peerConnections).forEach((pc) => pc.close());
      socket.current.disconnect();
    };
  }, [roomId, peerConnections]);

  const endCall = () => {
    Object.values(peerConnections).forEach((pc) => pc.close());
    socket.current.emit("leave-room", roomId);
    onEndCall();
  };

  return (
    <div className="call-room">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted className="local-video" />
        {streams.map((stream, index) => (
          <video key={index} srcObject={stream} autoPlay className="remote-video" />
        ))}
      </div>
      <button onClick={endCall} className="end-call-button">
        End Call
      </button>
    </div>
  );
};

export default CallRoom;
