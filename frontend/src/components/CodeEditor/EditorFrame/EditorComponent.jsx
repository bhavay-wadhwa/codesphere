import { Editor, useMonaco } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { setUserCode } from "@/features/CodeSlice/codeSlice";
import { setRoomDetails, updateRoomDetails } from "@/features/RoomSlice/RoomSlice";
import { defaultCodeArr } from "@/data/defaultCode.js";

const EditorComponent = ({ socket }) => {
  const aboveTablet = window.innerWidth >= 768 ? true : false;

  const dispatch = useDispatch();
  const location = useLocation();
  const monaco = useMonaco();
  const roomId = location?.state?.roomId;

  const room = useSelector((state) => state.room.room.roomDetails);
  const userCode = useSelector((state) => state.code.userCode);
  const userId = useSelector((state) => state.profile.user._id);
  const [language, setLanguage] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const userCodeRef = useRef(userCode);
  const languageRef = useRef(room?.language);
  const editorRef = useRef(null);
  const cursorDecorationsRef = useRef({});
  const changeTimer = useRef(null);

  useEffect(() => {

    if (room?.language) {
      const derivedLanguage = room.language.split(" ")[0].toLowerCase();
      languageRef.current = room?.language;
      setLanguage(derivedLanguage === "c++" ? "cpp" : derivedLanguage);
    }
  }, [room?.language]);

  useEffect(() => {
    const updateEditMode = () => {
      const editorIds = (room?.editors || []).map(String);
      const isAdmin = room?.admin?.toString?.() === userId;
      const hasEditor = isAdmin || editorIds.includes(userId);
      setCanEdit(hasEditor);
      setIsViewer(!hasEditor);
    };

    updateEditMode();
  }, [room, userId]);

  useEffect(() => {
    return () => {
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleInitial = (data) => {
      if (data?.code !== undefined) {
        dispatch(setUserCode(data.code));
        userCodeRef.current = data.code;
      }
      if (data?.language) {
        languageRef.current = data.language;
        setLanguage(data.language.split(" ")[0].toLowerCase() === "c++" ? "cpp" : data.language.split(" ")[0].toLowerCase());
      }
      dispatch(setRoomDetails(data));
    };

    const handleReceiveCode = (data) => {
      if (data?.userId === userId) return;
      if (data?.code !== undefined) {
        dispatch(setUserCode(data.code));
        userCodeRef.current = data.code;
      }
      if (data?.language) {
        languageRef.current = data.language;
        setLanguage(data.language.split(" ")[0].toLowerCase() === "c++" ? "cpp" : data.language.split(" ")[0].toLowerCase());
      }
    };

    const handleCursorUpdated = ({ userId: uid, position, name }) => {
      try {
        const editor = editorRef.current;
        if (!editor || !position) return;
        const line = Math.max(1, position.line + 1);
        const column = Math.max(1, position.ch + 1);
        const range = new monaco.Range(line, column, line, column);
        const decorationId = cursorDecorationsRef.current[uid] ? [cursorDecorationsRef.current[uid]] : [];
        const newDec = [{
          range,
          options: {
            className: 'remote-cursor',
            stickiness: 1,
            hoverMessage: { value: name },
          },
        }];
        const updated = editor.deltaDecorations(decorationId, newDec);
        cursorDecorationsRef.current[uid] = updated[0];
      } catch (err) {
        // fail silently
      }
    };

    const handleUserLeft = ({ userId: uid }) => {
      const editor = editorRef.current;
      if (!editor || !cursorDecorationsRef.current[uid]) return;
      editor.deltaDecorations([cursorDecorationsRef.current[uid]], []);
      delete cursorDecorationsRef.current[uid];
    };

    socket.on('initialState', handleInitial);
    socket.on('receiveCode', handleReceiveCode);
    socket.on('cursor-updated', handleCursorUpdated);
    socket.on('userLeft', handleUserLeft);
    const handleAccessChanged = (payload) => {
      if (payload?.userId === userId) {
        const editorIds = (room?.editors || []).map(String);
        const isAdmin = room?.admin?.toString?.() === userId;
        const hasEditor = isAdmin || editorIds.includes(userId);
        setCanEdit(hasEditor);
        setIsViewer(!hasEditor);
      }
    };
    socket.on('accessChanged', handleAccessChanged);

    return () => {
      socket.off('initialState', handleInitial);
      socket.off('receiveCode', handleReceiveCode);
      socket.off('cursor-updated', handleCursorUpdated);
      socket.off('userLeft', handleUserLeft);
      socket.off('accessChanged', handleAccessChanged);
    };
  }, [socket, userId, dispatch, room]);

  useEffect(() => {
    if(monaco) {
        monaco.editor.defineTheme('custom-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', foreground: 'D4D4D4', background: '10151B' },
                { token: 'comment', foreground: '808080' }, 
                { token: 'keyword', foreground: 'FE4EDA' }, 
                { token: 'string', foreground: '32CD32' }, 
                { token: 'function', foreground: 'F1C40F' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'constant', foreground: '4FC1FF' }, 
                { token: 'number', foreground: '56B6C2' }, 
                { token: 'delimiter', foreground: 'D4D4D4' },
                { token: 'error', foreground: 'F44747' }, 
            ],
            colors: {
                "editor.background": "#10151B", 
                'editorLineNumber.foreground': '#4B5263',
                'editor.selectionBackground': '#264F78', 
                'editorIndentGuide.background': '#2E2E3E', 
                "scrollbarSlider.background": "#4A5568", 
                "scrollbarSlider.hoverBackground": "#718096", 
                "scrollbarSlider.activeBackground": "#A0AEC0",
                "editor.lineHighlightBackground": "#1B2635",
            }
        });

        monaco.editor.setTheme('custom-theme');
    }

},[monaco])

  const handleCodeChange = (value) => {
    if (!canEdit) return;

    dispatch(setUserCode(value));
    userCodeRef.current = value;

    if (socket && roomId && languageRef.current) {
      if (changeTimer.current) {
        clearTimeout(changeTimer.current);
      }
      changeTimer.current = setTimeout(() => {
        socket.emit("editor-change", { roomId, code: userCodeRef.current, language: languageRef.current });
      }, 120);
    }
  }

  const handleEditorMount = (editor, monacoIns) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((ev) => {
      const pos = ev.position;
      const position = { line: pos.lineNumber - 1, ch: pos.column - 1 };
      if (socket && roomId) {
        socket.emit('cursor-move', { roomId, position });
      }
    });
  }

  return (
    <div className=" w-full h-[92%] sm:h-[90%] flex flex-col md:flex-row ">
      {language && socket && userCode !== null && (
        <div className="w-full h-full">
          <Editor
            className="h-full md:h-full"
            width="100%"
            defaultLanguage={language}
            defaultValue={defaultCodeArr[language === "cpp" ? "c++" : language]}
            value={userCode}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
            theme="custom-theme"
            options={{
              minimap: { enabled: false },
              fontSize: 16,
              cursorBlinking: "expand",
              automaticLayout: true,
              scrollBeyondLastLine: true,
              highlightActiveLine: true,
              suggestOnTriggerCharacters: true,
              readOnly: !canEdit,
              scrollbar: {
                vertical: "invisible",
                horizontal: "visible",
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12,
                verticalSliderSize: 10,
                horizontalSliderSize: 10,
              },
            }}
          />
        </div>
      )}
      {isViewer && (
        <div className="absolute top-16 right-4 px-3 py-2 rounded-md bg-yellow-500/10 text-yellow-200 border border-yellow-500/30 text-sm">
          You are in view-only mode. Only owners and granted editors can edit and run code.
        </div>
      )}
    </div>
  );
};

export default EditorComponent;
