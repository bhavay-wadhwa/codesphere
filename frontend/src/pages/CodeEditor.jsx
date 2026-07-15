import { getRoomDetails } from "@/api/user";
import EditorComponent from "@/components/CodeEditor/EditorFrame/EditorComponent";
import TopBar from "@/components/CodeEditor/EditorFrame/TopBar";
import EditorSidebar from "@/components/CodeEditor/EditorSidebar/EditorSidebar";
import Terminal from "@/components/CodeEditor/Terminal/TerminalComponent";
import { setRoomDetails, updateRoomDetails } from "@/features/RoomSlice/RoomSlice";
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
import { closeTerminal } from "@/features/EditorSlice/terminalSlice";

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

      socket.on("userJoined", ({ userName }) => {
        toast.info(`${userName} joined the room`, {
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

      socket.on("removedFromRoom", () => {
        toast.error("You have been removed from the room.", { autoClose: 3000 });
        navigate("/");
      });

      socket.on("initialState", (data) => {
        if (data) {
          dispatch(setRoomDetails(data));
        }
      });

      socket.on("members-updated", (payload) => {
        if (payload) {
          dispatch(updateRoomDetails(payload));
        }
      });

      socket.on("roomLocked", ({ by }) => {
        toast.info(`Room locked by ${by}`);
        dispatch(updateRoomDetails({ isLocked: true }));
      });

      socket.on("roomUnlocked", ({ by }) => {
        toast.info(`Room unlocked by ${by}`);
        dispatch(updateRoomDetails({ isLocked: false }));
      });

      socket.on("roomLocked", ({ by }) => {
        toast.info(`Room locked by ${by}`);
      });

      socket.on("roomUnlocked", ({ by }) => {
        toast.info(`Room unlocked by ${by}`);
      });
    }

    getRoomData();

    return () => {
      if (socket) {
        socket.off("connect_error", handleConnectionFail);
        socket.off("connect_failed", handleConnectionFail);
        socket.off("userJoined");
        socket.off("receiveMessage");
        socket.off("userLeft");
        socket.off("removedFromRoom");
        socket.off("initialState");
        socket.off("members-updated");
        socket.off("roomLocked");
        socket.off("roomUnlocked");
        socket.disconnect();
        dispatch(closeTerminal());
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
          <TopBar socket={socketInstance} />
          <EditorComponent socket={socketInstance} />
          <Terminal socket={socketInstance} />
        </div>
      )}
    </>
  );
};

export default CodeEditor;
