import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeTerminal } from "@/features/EditorSlice/terminalSlice.js";
import Terminal, { ColorMode, TerminalOutput } from "react-terminal-ui";
import { toast } from "react-toastify";

const TerminalComponent = ({ socket }) => {
  const dispatch = useDispatch();
  const isTerminalOpen = useSelector((state) => state.terminal.isTerminalOpen);
  const userCode = useSelector((state) => state.code.userCode);
  const remoteUserCode = useSelector((state) => state.code.remoteUserCode);
  const terminalUser = useSelector((state) => state.terminal.terminalUser);
  const room = useSelector((state) => state.room.room.roomDetails);

  const [codeInput, setCodeInput] = useState("");
  const [compiling, setCompiling] = useState(false);

  const [terminalLineData, setTerminalLineData] = useState([
    <TerminalOutput key={1}>{""}</TerminalOutput>,
  ]);

  const handleCodeRun = async (e) => {
    e.preventDefault();
    setCompiling(true);
    document.body.style.cursor = "wait";

    let normalized = codeInput || "";
    normalized = normalized.replace(/\r\n/g, "\n").replace(/\t/g, " ");
    normalized = normalized
      .split("\n")
      .map((line) => line.replace(/[ ]+/g, " ").trimEnd())
      .join("\n")
      .trim();

    if (!socket) {
      toast.error("Socket not connected", { autoClose: 3000 });
      setCompiling(false);
      document.body.style.cursor = "default";
      return;
    }

    let language = room?.language;
    language = language?.split(" ")[0].toLowerCase();

    let code = userCode;

    // Emit run request to server; server will broadcast result to all members
    socket.emit('run-code', { roomId: room?._id, code, language, input: normalized });

    // wait for run-result event (handled below by socket listener)
    setCompiling(false);
    document.body.style.cursor = "default";
  };

  // Listen for run results from server
  useEffect(() => {
    if (!socket) return;

    const handleRunResult = ({ run, ranBy }) => {
      if (!run) return;
      const output = run.stdout || run.stderr || '';
      const lines = (output || '').toString().split('\n');
      const terminalData = lines.map((line, index) => (
        <TerminalOutput key={index}>{line}</TerminalOutput>
      ));
      setTerminalLineData(terminalData.length ? terminalData : [<TerminalOutput key={1}>{''}</TerminalOutput>]);
    };

    const handleRunError = ({ message }) => {
      toast.error(message || 'Run failed');
    };

    const handleActionDenied = ({ reason }) => {
      toast.error(reason || 'Action denied');
    };

    socket.on('run-result', handleRunResult);
    socket.on('run-error', handleRunError);
    socket.on('actionDenied', handleActionDenied);

    return () => {
      socket.off('run-result', handleRunResult);
      socket.off('run-error', handleRunError);
      socket.off('actionDenied', handleActionDenied);
    };
  }, [socket]);

  return (
    <div
      className={`absolute ${
        isTerminalOpen ? " bottom-0" : " bottom-[-100%]"
      } transition-all duration-500 ease-in-out  w-full flex flex-col-reverse md:flex-row h-[250px] z-20 border-t border-t-slate-600`}
    >
      <div className="w-full md:w-[60%] h-full">
        <Terminal
          name="CodeSphere-Terminal"
          height="165px"
          colorMode={ColorMode.Dark}
        >
          {terminalLineData}
        </Terminal>
      </div>

      <div className="w-full md:w-[40%] h-full bg-[#252a33] p-4 pt-1 border border-l-slate-700 ">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-mono font-medium text-gray-400">
            Input
          </div>
          <div className="flex gap-2">
            <Button disabled={compiling} onClick={handleCodeRun}>
              Run
            </Button>
            <Button
              onClick={() => dispatch(closeTerminal())}
              variant="destructive"
            >
              Close
            </Button>
          </div>
        </div>
        <textarea
          placeholder="Your program will run without input"
          className="w-full p-2 bg-transparent resize-none border border-slate-600 rounded-md h-[120px]"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        ></textarea>
        <p className=" text-gray-400 text-xs">
          Type input by giving space separated values
        </p>
      </div>
    </div>
  );
};

export default TerminalComponent;
