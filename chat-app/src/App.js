import React, { useState } from "react";
import { Chat } from "./components/Chat";
import { Auth } from "./components/Auth";
import { AppWrapper } from "./components/AppWrapper";
import {CallRoom} from "./components/CallRoom"; // Import CallRoom as default
import Cookies from "universal-cookie";
import "./App.css";

const cookies = new Cookies();

function ChatApp() {
  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));
  const [isInChat, setIsInChat] = useState(false);
  const [room, setRoom] = useState("");
  const [isInCall, setIsInCall] = useState(false); // Track if in a call
  const [callRoomId, setCallRoomId] = useState(""); // Store call room ID

  const startCall = (roomId) => {
    setCallRoomId(roomId);
    setIsInCall(true);
  };

  const endCall = () => {
    setIsInCall(false);
    setCallRoomId("");
  };

  if (!isAuth) {
    return (
      <AppWrapper isAuth={isAuth} setIsAuth={setIsAuth} setIsInChat={setIsInChat}>
        <Auth setIsAuth={setIsAuth} />
      </AppWrapper>
    );
  }

  return (
    <AppWrapper isAuth={isAuth} setIsAuth={setIsAuth} setIsInChat={setIsInChat}>
      {isInCall ? (
        <CallRoom roomId={callRoomId} onEndCall={endCall} />
      ) : !isInChat ? (
        <div className="room">
          <label>Type Room ID:</label>
          <input onChange={(e) => setRoom(e.target.value)} value={room} />
          <button
            onClick={() => {
              setIsInChat(true);
            }}
          >
            Enter Chat
          </button>
          <button
            onClick={() => startCall(room)} // Start call with the room ID
          >
            Start Video Call
          </button>
        </div>
      ) : (
        <Chat room={room} />
      )}
    </AppWrapper>
  );
}

export default ChatApp;
