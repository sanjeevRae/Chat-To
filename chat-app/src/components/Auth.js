import { auth, provider } from "../firebase-config.js";
import { signInWithPopup } from "firebase/auth";
import "../styles/Auth.css";
import Cookies from "universal-cookie";

const cookies = new Cookies();

export const Auth = ({ setIsAuth }) => {
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      cookies.set("auth-token", result.user.refreshToken);
      setIsAuth(true);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="auth">
      <button onClick={signInWithGoogle}> Sign In With Google </button>
      <p>&copy;2024 BCA 5th. All rights reserved.&nbsp; &nbsp;| <a href="https://ibb.co/rQLmxmW" target="blank">Credits </a>&nbsp;</p>
    </div>
  );
};
