import { FS_FETCH_QUEST_META } from "@/constants/FS_MessageTypes";

export const handleFsFunctions = (conn: WebSocket | null) => {
  if (!conn) return;

  conn.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("Received message:", message);
  };
}

export const fetchQuestMeta = (conn: WebSocket, path = "") => {

  conn.send(JSON.stringify({ type: FS_FETCH_QUEST_META, path }));

};
