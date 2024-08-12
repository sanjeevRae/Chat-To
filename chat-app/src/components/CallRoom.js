// // import React, { useEffect, useRef, useState } from 'react';
// // import io from 'socket.io-client';
// // import '../styles/CallRoom.css';

// // const CallRoom = ({ roomId, onEndCall }) => {
// //   const localVideoRef = useRef(null);
// //   const [peerConnections, setPeerConnections] = useState({});
// //   const [streams, setStreams] = useState([]);
// //   const [participantCount, setParticipantCount] = useState(0);
// //   const socket = useRef(null);

// //   useEffect(() => {
// //     // Initialize socket connection
// //     socket.current = io('http://localhost:5000');
// //     console.log(`Joining room: ${roomId}`);
// //     socket.current.emit('join-room', roomId);

// //     socket.current.on('update-participant-count', (count) => {
// //       setParticipantCount(count);
// //     });

// //     const servers = {
// //       iceServers: [
// //         { urls: 'stun:stun.l.google.com:19302' },
// //       ],
// //     };

// //     // Get local media stream
// //     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
// //       .then((stream) => {
// //         localVideoRef.current.srcObject = stream;

// //         socket.current.on('new-peer', (peerId) => {
// //           const pc = new RTCPeerConnection(servers);
// //           pc.addStream(stream);
// //           pc.onicecandidate = (event) => {
// //             if (event.candidate) {
// //               socket.current.emit('send-ice-candidate', {
// //                 target: peerId,
// //                 candidate: event.candidate,
// //               });
// //             }
// //           };
// //           pc.ontrack = (event) => {
// //             setStreams((prevStreams) => [...prevStreams, event.streams[0]]);
// //           };
// //           setPeerConnections((prevConnections) => ({
// //             ...prevConnections,
// //             [peerId]: pc,
// //           }));

// //           // Create and send offer
// //           pc.createOffer()
// //             .then((offer) => pc.setLocalDescription(offer))
// //             .then(() => {
// //               socket.current.emit('send-offer', {
// //                 target: peerId,
// //                 offer: pc.localDescription,
// //               });
// //             });
// //         });

// //         socket.current.on('receive-offer', async (data) => {
// //           const pc = new RTCPeerConnection(servers);
// //           pc.addStream(stream);
// //           pc.onicecandidate = (event) => {
// //             if (event.candidate) {
// //               socket.current.emit('send-ice-candidate', {
// //                 target: data.peerId,
// //                 candidate: event.candidate,
// //               });
// //             }
// //           };
// //           pc.ontrack = (event) => {
// //             setStreams((prevStreams) => [...prevStreams, event.streams[0]]);
// //           };
// //           await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
// //           const answer = await pc.createAnswer();
// //           await pc.setLocalDescription(answer);
// //           socket.current.emit('send-answer', {
// //             target: data.peerId,
// //             answer: pc.localDescription,
// //           });
// //           setPeerConnections((prevConnections) => ({
// //             ...prevConnections,
// //             [data.peerId]: pc,
// //           }));
// //         });

// //         socket.current.on('receive-answer', async (data) => {
// //           const pc = peerConnections[data.peerId];
// //           await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
// //         });

// //         socket.current.on('receive-ice-candidate', async (data) => {
// //           const pc = peerConnections[data.peerId];
// //           await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
// //         });

// //       })
// //       .catch((error) => console.error('Error accessing media devices.', error));

// //     return () => {
// //       Object.values(peerConnections).forEach((pc) => pc.close());
// //       socket.current.disconnect();
// //     };
// //   }, [roomId, peerConnections]);

// //   const endCall = () => {
// //     Object.values(peerConnections).forEach((pc) => pc.close());
// //     socket.current.emit('leave-room', roomId);
// //     onEndCall();
// //   };

// //   return (
// //     <div className="call-room">
// //       <div className="video-container">
// //         <video ref={localVideoRef} autoPlay muted className="local-video" />
// //         {streams.map((stream, index) => (
// //           <video key={index} autoPlay className="remote-video" />
// //         ))}
// //       </div>
// //       <div className="participant-count">
// //         Participants: {participantCount}
// //       </div>
// //       <button onClick={endCall} className="end-call-button">
// //         End Call
// //       </button>
// //     </div>
// //   );
// // };

// // export default CallRoom;


// import React, { useEffect, useRef, useState } from "react";
// import { db } from "../firebase-config";
// import {
//   doc,
//   setDoc,
//   updateDoc,
//   onSnapshot,
//   collection,
//   addDoc
// } from "firebase/firestore";
// import "../styles/CallRoom.css";

// const CallRoom = ({ roomId, onEndCall }) => {
//   const [localStream, setLocalStream] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);

//   useEffect(() => {
//     const peerConnection = new RTCPeerConnection();

//     const handleNegotiationNeeded = async () => {
//       try {
//         const offer = await peerConnection.createOffer();
//         await peerConnection.setLocalDescription(offer);
//         await setDoc(doc(db, "calls", roomId), { offer: offer.toJSON() });
//       } catch (error) {
//         console.error("Error during negotiation:", error);
//       }
//     };

//     peerConnection.onicecandidate = async (event) => {
//       if (event.candidate) {
//         try {
//           await addDoc(collection(db, "calls", roomId, "candidates"), event.candidate.toJSON());
//         } catch (error) {
//           console.error("Error adding ICE candidate:", error);
//         }
//       }
//     };

//     peerConnection.ontrack = (event) => {
//       if (remoteVideoRef.current) {
//         remoteVideoRef.current.srcObject = event.streams[0];
//         setRemoteStream(event.streams[0]);
//       }
//     };

//     const getMedia = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         if (localVideoRef.current) {
//           localVideoRef.current.srcObject = stream;
//           setLocalStream(stream);
//         }
//         stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
//       } catch (error) {
//         console.error("Error accessing media devices.", error);
//       }
//     };

//     getMedia();

//     const unsubscribe = onSnapshot(doc(db, "calls", roomId), async (doc) => {
//       try {
//         const data = doc.data();
//         if (data?.offer) {
//           await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
//           const answer = await peerConnection.createAnswer();
//           await peerConnection.setLocalDescription(answer);
//           await updateDoc(doc(db, "calls", roomId), { answer: answer.toJSON() });
//         }
//         if (data?.answer) {
//           await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
//         }
//       } catch (error) {
//         console.error("Error handling snapshot:", error);
//       }
//     });

//     return () => {
//       unsubscribe();
//       peerConnection.close();
//       if (localStream) {
//         localStream.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, [roomId]);

//   return (
//     <div className="call-room">
//       <video ref={localVideoRef} autoPlay muted></video>
//       <video ref={remoteVideoRef} autoPlay></video>
//       <button onClick={onEndCall}>End Call</button>
//     </div>
//   );
// };

// export default CallRoom;

// import React, { useEffect, useState, useRef } from 'react';
// import { db } from '../firebase-config'; // Adjust import based on your setup
// import { doc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore'; // Import getDocs here
// import { io } from 'socket.io-client'; // Ensure you have socket.io-client installed

// const socket = io('http://localhost:5000'); // Replace with your server URL

// const CallRoom = ({ roomId }) => {
//   const [peerConnection, setPeerConnection] = useState(null);
//   const [iceCandidates, setIceCandidates] = useState([]);
//   const localStreamRef = useRef(null);
//   const remoteStreamRef = useRef(null);
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);

//   useEffect(() => {
//     const setupConnection = async () => {
//       // Create RTCPeerConnection and set up event handlers
//       const pc = new RTCPeerConnection({
//         iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Use your STUN/TURN server here
//       });

//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           // Send the ICE candidate to the other peer
//           socket.emit('ice-candidate', { roomId, candidate: event.candidate });
//         }
//       };

//       pc.ontrack = (event) => {
//         if (remoteVideoRef.current) {
//           remoteVideoRef.current.srcObject = event.streams[0];
//         }
//       };

//       setPeerConnection(pc);

//       // Get local media stream
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       localStreamRef.current = stream;
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//       }
//       stream.getTracks().forEach((track) => pc.addTrack(track, stream));

//       // Join room
//       socket.emit('join-room', roomId);

//       // Handle incoming ICE candidates
//       socket.on('ice-candidate', async (data) => {
//         if (data.roomId === roomId) {
//           await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
//         }
//       });

//       // Handle incoming offer and answer
//       socket.on('offer', async (data) => {
//         if (data.roomId === roomId) {
//           await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
//           const answer = await pc.createAnswer();
//           await pc.setLocalDescription(answer);
//           socket.emit('answer', { roomId, answer });
//         }
//       });

//       socket.on('answer', async (data) => {
//         if (data.roomId === roomId) {
//           await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
//         }
//       });

//       // Fetch ICE candidates from Firestore
//       const fetchIceCandidates = async () => {
//         const iceCandidatesRef = collection(db, `calls/${roomId}/iceCandidates`);
//         const snapshot = await getDocs(iceCandidatesRef);
//         snapshot.forEach((doc) => {
//           pc.addIceCandidate(new RTCIceCandidate(doc.data().candidate));
//         });
//       };

//       fetchIceCandidates();
//     };

//     setupConnection();

//     return () => {
//       if (peerConnection) {
//         peerConnection.close();
//       }
//     };
//   }, [roomId]);

//   const handleStartCall = async () => {
//     if (!peerConnection) return;

//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);

//     socket.emit('offer', { roomId, offer });

//     // Save offer to Firestore
//     const roomDocRef = doc(db, 'calls', roomId);
//     await setDoc(roomDocRef, {
//       createdAt: new Date(),
//       status: 'active'
//     }, { merge: true });
//   };

//   return (
//     <div className="call-room">
//       <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
//       <video ref={remoteVideoRef} autoPlay style={{ width: '300px' }} />
//       <button onClick={handleStartCall}>Start Call</button>
//     </div>
//   );
// };

// export default CallRoom;




// best so far


// import React, { useState, useEffect, useRef } from "react";
// import { db, auth } from "../firebase-config";
// import { collection, addDoc, doc, setDoc, onSnapshot, serverTimestamp, getDocs } from "firebase/firestore";
// import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for rooms

// export const CallRoom = ({ roomId }) => {
//   const [localStream, setLocalStream] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [peerConnection, setPeerConnection] = useState(null);
//   const [users, setUsers] = useState([]);
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);

//   useEffect(() => {
//     const setup = async () => {
//       // Set up local media stream
//       const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       localVideoRef.current.srcObject = localStream;
//       setLocalStream(localStream);

//       // Set up peer connection
//       const pc = new RTCPeerConnection();
//       setPeerConnection(pc);

//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           addDoc(collection(db, `calls/${roomId}/iceCandidates`), event.candidate.toJSON())
//             .catch(error => console.error('Error adding ICE candidate:', error));
//         }
//       };

//       pc.ontrack = (event) => {
//         setRemoteStream(event.streams[0]);
//         remoteVideoRef.current.srcObject = event.streams[0];
//       };

//       localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

//       // Handle incoming ICE candidates
//       const unsubscribe = onSnapshot(collection(db, `calls/${roomId}/iceCandidates`), (snapshot) => {
//         snapshot.docChanges().forEach(async (change) => {
//           if (change.type === 'added') {
//             const data = change.doc.data();
//             if (data && data.sdpMid && data.sdpMLineIndex != null) {
//               const candidate = new RTCIceCandidate(data);
//               if (pc.remoteDescription) {
//                 try {
//                   await pc.addIceCandidate(candidate);
//                 } catch (error) {
//                   console.error('Error adding ICE candidate:', error);
//                 }
//               } else {
//                 console.warn('Remote description not set yet, waiting for it.');
//               }
//             } else {
//               console.warn('Invalid ICE candidate data:', data);
//             }
//           }
//         });
//       });

//       // Update user list when someone joins
//       const usersRef = collection(db, 'calls');
//       const querySnapshot = await getDocs(usersRef);
//       const usersList = querySnapshot.docs.map(doc => doc.data());
//       setUsers(usersList);

//       return () => {
//         unsubscribe();
//         pc.close();
//       };
//     };

//     setup();
//   }, [roomId]);

//   const handleStartCall = async () => {
//     if (peerConnection) {
//       const offer = await peerConnection.createOffer();
//       await peerConnection.setLocalDescription(offer);

//       await setDoc(doc(db, `calls/${roomId}`), {
//         offer: {
//           sdp: offer.sdp,
//           type: offer.type
//         },
//         createdAt: serverTimestamp(),
//         status: "active"
//       });
//     }
//   };

//   const handleJoinCall = async () => {
//     const callDoc = doc(db, `calls/${roomId}`);
//     const callData = (await getDocs(callDoc)).data();
    
//     if (callData && callData.offer) {
//       const offer = new RTCSessionDescription({
//         sdp: callData.offer.sdp,
//         type: callData.offer.type
//       });
//       await peerConnection.setRemoteDescription(offer);

//       const answer = await peerConnection.createAnswer();
//       await peerConnection.setLocalDescription(answer);

//       await setDoc(callDoc, { answer: {
//         sdp: answer.sdp,
//         type: answer.type
//       }}, { merge: true });
//     }
//   };

//   return (
//     <div className="call-room">
//       <div className="video-container">
//         <video ref={localVideoRef} autoPlay muted />
//         <video ref={remoteVideoRef} autoPlay />
//       </div>
//       <button onClick={handleStartCall}>Start Call</button>
//       <button onClick={handleJoinCall}>Join Call</button>
//       <div className="users-list">
//         <h3>Users in Room:</h3>
//         <ul>
//           {users.map((user, index) => (
//             <li key={index}>{user.username || "Unknown User"}</li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// };


import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase-config";
import { collection, addDoc, doc, setDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import '../styles/CallRoom.css'; // Import your CSS file

export const CallRoom = ({ roomId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareStream = useRef(null);

  useEffect(() => {
    const setup = async () => {
      try {
        // Set up local media stream
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = localStream;
        setLocalStream(localStream);

        // Set up peer connection
        const pc = new RTCPeerConnection();
        setPeerConnection(pc);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, `calls/${roomId}/iceCandidates`), event.candidate.toJSON())
              .catch(error => console.error('Error adding ICE candidate:', error));
          }
        };

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setRemoteStream(event.streams[0]);
          }
        };

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        // Handle incoming ICE candidates
        const unsubscribeCandidates = onSnapshot(collection(db, `calls/${roomId}/iceCandidates`), (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data));
                } catch (error) {
                  console.error('Error adding ICE candidate:', error);
                }
              }
            }
          });
        });

        // Set up call on room entry
        const callDocRef = doc(db, `calls/${roomId}`);
        const callDoc = await getDoc(callDocRef);

        if (callDoc.exists()) {
          const callData = callDoc.data();
          
          if (callData.offer && !callData.answer) {
            // Room has an offer, join the call
            const offer = new RTCSessionDescription({
              sdp: callData.offer.sdp,
              type: callData.offer.type
            });
            await pc.setRemoteDescription(offer);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await updateDoc(callDocRef, {
              answer: {
                sdp: answer.sdp,
                type: answer.type
              }
            });
          } else if (callData.answer) {
            // Room has an answer, complete the connection
            const answer = new RTCSessionDescription({
              sdp: callData.answer.sdp,
              type: callData.answer.type
            });
            await pc.setRemoteDescription(answer);
          } else {
            // Start the call (no offer or answer)
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await setDoc(callDocRef, {
              offer: {
                sdp: offer.sdp,
                type: offer.type
              }
            });
          }
        } else {
          // No room document, create one and start call
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await setDoc(callDocRef, {
            offer: {
              sdp: offer.sdp,
              type: offer.type
            }
          });
        }

        return () => {
          unsubscribeCandidates();
          pc.close();
        };
      } catch (error) {
        console.error('Error setting up call:', error);
      }
    };

    setup();
  }, [roomId]);

  const handleEndCall = () => {
    if (peerConnection) {
      peerConnection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = !isMuted));
      setIsMuted(!isMuted);
    }
  };

  const handleCameraToggle = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => (track.enabled = !isCameraOn));
      setIsCameraOn(!isCameraOn);
    }
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenShareStream.current = screenStream;

      if (peerConnection) {
        screenStream.getTracks().forEach(track => peerConnection.addTrack(track, screenStream));
      }

      // Display the screen share stream in a new video element or overlay
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.autoplay = true;
      screenVideo.style.position = 'absolute';
      screenVideo.style.top = '0';
      screenVideo.style.right = '0';
      screenVideo.style.width = '30%'; // Adjust the size as needed
      screenVideo.style.height = '30%'; // Adjust the size as needed
      document.body.appendChild(screenVideo);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  return (
    <div className="call-room">
      <div className="video-container">
        <video ref={localVideoRef} autoPlay muted className="local-video" />
        <video ref={remoteVideoRef} autoPlay className="remote-video" />
      </div>
      <div className="controls">
        <button onClick={handleEndCall}>End Call</button>
        <button onClick={handleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={handleCameraToggle}>{isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}</button>
        <button onClick={handleScreenShare}>Share Screen</button>
      </div>
    </div>
  );
};
