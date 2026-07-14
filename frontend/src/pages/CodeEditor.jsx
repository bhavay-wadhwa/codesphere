import { getCode, getRoomDetails } from "@/api/user";
import EditorComponent from "@/components/CodeEditor/EditorFrame/EditorComponent";
import TopBar from "@/components/CodeEditor/EditorFrame/TopBar";
import EditorSidebar from "@/components/CodeEditor/EditorSidebar/EditorSidebar";
import Terminal from "@/components/CodeEditor/Terminal/TerminalComponent";
import { setRoomDetails } from "@/features/RoomSlice/RoomSlice";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  toogleNewMessage,
  toogleparticipantsChange,
} from "@/features/RoomSlice/RoomSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { toggleSidebar } from "@/features/EditorSlice/sidebarSlice";
import { setRemoteUserCode, setUserCode } from "@/features/CodeSlice/codeSlice";
import { closeTerminal } from "@/features/EditorSlice/terminalSlice";
import { closeRemoteEditor } from "@/features/EditorSlice/remoteEditorSlice";
import { defaultCodeArr } from "@/data/defaultCode";

const CodeEditor = () => {
  const BACK_URL = import.meta.env.PROD
    ? window.location.origin
    : import.meta.env.VITE_API_URL ?? import.meta.env.VITE_B_URL ?? window.location.origin;
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const roomId = location?.state?.roomId;
  const room = useSelector((state) => state.room.room.roomDetails)
  const [socketInstance, setSocketInstance] = useState(null);


  const handleConnectionFail = (err) => {
    toast.error("Connection failed", { autoClose: 4000 });
    navigate("/");
  };

  const getRoomData = async () => {
    const res = await getRoomDetails(roomId);

    if (!res) {
      return;
    }

    dispatch(setRoomDetails(res.room));
  };

  const getUserCode = async () => {
    const res = await getCode(roomId);

    if (!res) {
      return;
    }
    console.log("get code:",res);

    dispatch(setUserCode(res?.code?.code));
  }

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const socket = io(`${BACK_URL}`, {
      // user try to connect with the socket server
      withCredentials: true,
      forceNew: true,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });

    if (socket) {
      setSocketInstance(socket);
      socket.on("connect_error", handleConnectionFail);
      socket.on("connect_failed", handleConnectionFail);
      socket.on("connect", () => {
        socket.emit("join-room", roomId);
        console.log("Joining room");
      });

      socket.on("userJoined", (socket) => {
        toast.info(`${socket.userName} joined the room`, {
          position: "bottom-right",
          autoClose: 2000,
        });

        dispatch(toogleparticipantsChange());
      });

      socket.on("receiveMessage", () => {
        dispatch(toogleNewMessage());
      });

      socket.on("userLeft", () => {
        dispatch(toogleparticipantsChange());
      });

    }

    getRoomData();
    getUserCode();

    return () => {
      if(socket) {
        socket.off("connect_error");
        socket.off("connect_failed");
        socket.off("userJoined");
        socket.off("receiveMessage");
        socket.off("userLeft");
        socket.disconnect();
        dispatch(closeTerminal());
        dispatch(closeRemoteEditor());
        dispatch(setUserCode(defaultCodeArr[room?.language?.split(" ")[0].toLowerCase()]));
        dispatch(setRemoteUserCode(''));
        dispatch(setRoomDetails({}));
        dispatch(toggleSidebar(false));
      }
    };
  }, []);

  return (
    <>
      {socketInstance && (
        <div className="relative w-full h-screen overflow-y-hidden">
          <EditorSidebar socket={socketInstance} />
          <TopBar />
          <EditorComponent socket={socketInstance} />
          <Terminal />
        </div>
      )}
    </>
  );
};

export default CodeEditor;
