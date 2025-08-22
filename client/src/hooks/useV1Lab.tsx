/*
* What's happening here?
? Establish ws connection with the runner service
? Try sending and receiving few messages to test the connection

*/

import { useRef } from "react";

export default async function useV1Lab(){
  const wsConnRef = useRef<WebSocket | null>(null);

  try {
    const response = await spinUpContainer();
    if(!response.success) throw new Error("Failed to spin up container");
    const { success, conn } = establishWSConnection();

    if (success && conn) {
      wsConnRef.current = conn;
    }

  } catch (error) {
    console.error("Error establishing WebSocket connection:", error);
  }
}

async function spinUpContainer() : Promise<{success:boolean}>{
  try {
    const response = await fetch('http://localhost:8080/v1/start/quest?language=react') ;
    const data = await response.json();
    if(data.success){
      return {
        success: true
      }
    }
  
    else {
     throw new Error("Failed to spin up container with data", data);
    }
  } catch (error) {
    console.log("FAILED TO SPINUP", error)
    return {
      success: false,
    }
  }
}

function establishWSConnection() : { success: boolean; conn: WebSocket | null } {
  try {
    const conn = new WebSocket("ws://localhost:8080/ws");

    conn.onopen = () => {
      console.log("WebSocket connection established");
    };

    conn.onmessage = (event) => {
      console.log("Message received:", event.data);
    };

    conn.send("Hello Server!");

    return {
      success: true,
      conn,
    };
  } catch (error) {
    return {
      success:false,
      conn:null
    }
  }
}