import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import '../styles/CallRoom.css';

const CallRoom = ({ roomId, onEndCall }) => {
  const localVideoRef = useRef(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [streams, setStreams] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const socket = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socket.current = io('http://localhost:5000');
    console.log(`Joining room: ${roomId}`);
    socket.current.emit('join-room', roomId);

    socket.current.on('update-participant-count', (count) => {
      setParticipantCount(count);
    });

    const servers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;

        socket.current.on('new-peer', (peerId) => {
          const pc = new RTCPeerConnection(servers);
          pc.addStream(stream);
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.current.emit('send-ice-candidate', {
                target: peerId,
                candidate: event.candidate,
              });
            }
          };
          pc.ontrack = (event) => {
            setStreams((prevStreams) => [...prevStreams, event.streams[0]]);
          };
          setPeerConnections((prevConnections) => ({
            ...prevConnections,
            [peerId]: pc,
          }));

          // Create and send offer
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              socket.current.emit('send-offer', {
                target: peerId,
                offer: pc.localDescription,
              });
            });
        });

        socket.current.on('receive-offer', async (data) => {
          const pc = new RTCPeerConnection(servers);
          pc.addStream(stream);
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.current.emit('send-ice-candidate', {
                target: data.peerId,
                candidate: event.candidate,
              });
            }
          };
          pc.ontrack = (event) => {
            setStreams((prevStreams) => [...prevStreams, event.streams[0]]);
          };
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.current.emit('send-answer', {
            target: data.peerId,
            answer: pc.localDescription,
          });
          setPeerConnections((prevConnections) => ({
            ...prevConnections,
            [data.peerId]: pc,
          }));
        });

        socket.current.on('receive-answer', async (data) => {
          const pc = peerConnections[data.peerId];
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        socket.current.on('receive-ice-candidate', async (data) => {
          const pc = peerConnections[data.peerId];
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        });

      })
      .catch((error) => console.error('Error accessing media devices.', error));

    return () => {
      Object.values(peerConnections).forEach((pc) => pc.close());
      socket.current.disconnect();
    };
  }, [roomId, peerConnections]);

  const endCall = () => {
    Object.values(peerConnections).forEach((pc) => pc.close());
    socket.current.emit('leave-room', roomId);
    onEndCall();
  };

  return (
    <div className="call-room">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted className="local-video" />
        {streams.map((stream, index) => (
          <video key={index} autoPlay className="remote-video" />
        ))}
      </div>
      <div className="participant-count">
        Participants: {participantCount}
      </div>
      <button onClick={endCall} className="end-call-button">
        End Call
      </button>
    </div>
  );
};

export default CallRoom;
