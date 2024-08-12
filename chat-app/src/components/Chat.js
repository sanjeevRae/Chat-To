import React, { useState, useEffect, useRef } from "react";
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
import { format } from 'date-fns'; 
import "../styles/Chat.css";

const linkify = (text) => {
  const urlRegex = /((https?:\/\/[^\s]+))/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

export const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesRef = collection(db, "messages");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
      let messages = [];
      snapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      console.log(messages);
      setMessages(messages);
    });

    return () => unsubscribe();
  }, [room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newMessage === "" && !file) return;

    const { displayName, photoURL } = auth.currentUser;

    let fileURL = null;
    if (file) {
      const fileRef = ref(storage, `uploads/${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed: ", error);
          setUploadProgress(0);
        },
        async () => {
          fileURL = await getDownloadURL(uploadTask.snapshot.ref);
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
          setUploadProgress(0);
        }
      );
    } else {
      await addDoc(messagesRef, {
        text: newMessage || "",
        file: fileURL || null,
        createdAt: serverTimestamp(),
        user: displayName,
        userPhoto: photoURL,
        room,
      });
      setNewMessage("");
    }
  };

  const formatTimestamp = (timestamp) => {
    return format(timestamp.toDate(), 'p'); // Format time (e.g., 10:00 AM)
  };

  return (
    <div className="chat-app">
      <div className="header">
        <h1>Welcome to {room.toUpperCase()} Chat Room</h1>
        <div className="header-images">
          <img src="wp.png" className="header-image" alt="phone call" />
          <img src="wc.png" className="header-image" alt="video call" />
          <img src className="header-image" />
        </div>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.user === auth.currentUser.displayName
                ? "user-message"
                : "other-message"
            }`}
          >
            <div className="message-header">
              {message.userPhoto && (
                <img
                  src={message.userPhoto}
                  alt="User Profile"
                  className="user-photo"
                />
              )}
              <span className="user">{message.user}</span>
            </div>
            <div
              className="message-text"
              dangerouslySetInnerHTML={{ __html: linkify(message.text) }}
            />
            {message.file && (
              <div className="message-file">
                <a href={message.file} target="_blank" rel="noopener noreferrer">
                  <img
                    src={message.file}
                    alt="Uploaded File"
                    className="uploaded-file"
                  />
                </a>
              </div>
            )}
            <div className="message-time">
              {message.createdAt && formatTimestamp(message.createdAt)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="new-message-form">
        <div className="input-and-file-container">
          <input
            type="text"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            className="new-message-input"
            placeholder="Type your message here..."
          />
          <div className="file-input-container">
            <label className="custom-file-upload">
              <img src="attach-file.png" alt="Attach File Icon" />
              <input
                type="file"
                onChange={(event) => setFile(event.target.files[0])}
                className="hidden-file-input"
              />
            </label>
          </div>
        </div>
        {uploadProgress > 0 && (
          <div className="upload-progress">
            <span>Uploading: {Math.round(uploadProgress)}%</span>
          </div>
        )}
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};


