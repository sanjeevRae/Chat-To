import { auth } from "../firebase-config.js";
import { signOut } from "firebase/auth";

import Cookies from "universal-cookie";

const cookies = new Cookies();

export const AppWrapper = ({ children, isAuth, setIsAuth, setIsInChat }) => {
  const signUserOut = async () => {
    await signOut(auth);
    cookies.remove("auth-token");
    setIsAuth(false);
    setIsInChat(false);
  };

  return (
    <div className="App">
      <div className="app-header">
        <h1>CHAT TO  </h1>
        <p>By BCA 5th</p>
      </div>

      <div className="app-container">{children}</div>
      {isAuth && (
        <div className="sign-out">
          <button onClick={signUserOut}> Sign Out</button>
          <p>&copy;2024 BCA 5th. All rights reserved.&nbsp; &nbsp;| <a href="https://ibb.co/rQLmxmW" target="blank">Credits </a>&nbsp;</p>
        </div>
        
      )}
    </div>
  );
};
