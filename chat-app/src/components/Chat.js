import React, { useState, useEffect } from "react";
import { db, auth, storage } from "../firebase-config";  
import {
  collection,
  addDoc,
  where,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";  

import "../styles/Chat.css";

export const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);  
  const messagesRef = collection(db, "messages");

  useEffect(() => {
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );
    const unsuscribe = onSnapshot(queryMessages, (snapshot) => {
      let messages = [];
      snapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      console.log(messages);
      setMessages(messages);
    });

    return () => unsuscribe();
  }, [room]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newMessage === "" && !file) return;

    const { displayName, photoURL } = auth.currentUser;

    let fileURL = null;
    if (file) {
      const fileRef = ref(storage, `uploads/${file.name}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      fileURL = await getDownloadURL(uploadTask.ref);
    }

    await addDoc(messagesRef, {
      text: newMessage || "",
      file: fileURL || null,
      createdAt: serverTimestamp(),
      user: displayName,
      userPhoto: photoURL,
      room,
    });

    setNewMessage("");
    setFile(null);
  };

  return (
    <div className="chat-app">
      <div className="header">
        <h1>Welcome to {room.toUpperCase()} Chat Room</h1>
      </div>
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className="message">
            <div className="message-header">
              {message.userPhoto && (
                <img src={message.userPhoto} alt="User Profile" className="user-photo" />
              )}
              <span className="user">{message.user}</span>
            </div>
            <div className="message-text">
              {message.text}
            </div>
            {message.file && (
              <div className="message-file">
                <a href={message.file} target="_blank" rel="noopener noreferrer">
                  <img src={message.file} alt="uploaded file" className="uploaded-file" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="new-message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          className="new-message-input"
          placeholder="Type your message here..."
        />
        <input
          type="file"
          onChange={(event) => setFile(event.target.files[0])}
          className="file-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};
