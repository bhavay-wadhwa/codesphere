import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import React, { useEffect, useState } from 'react'
import {SquareX} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleSidebar } from '@/features/EditorSlice/sidebarSlice.js'
import { useLocation } from 'react-router-dom'
import { getMembers } from '@/api/user'
import { setremoteUserId, setRemoteUserName } from '@/features/CodeSlice/codeSlice'
import { toast } from 'react-toastify'

const Participants = ({setIsSidebarOpen, socket}) => {
  const isRemoteVisible = useSelector((state) => state.room.room.roomDetails.isVisible);
  const roomAdmin = useSelector((state) => state.room.room.roomDetails.admin);
  const user = useSelector((state) => state.profile.user);
  const userId = user._id;
  const dispatch = useDispatch();
  const location = useLocation();

  const roomId = location?.state?.roomId;

  const [participants, setParticipants] = useState([]);
  const [editorIds, setEditorIds] = useState([]);
  const [adminId, setAdminId] = useState(null);

  // Initialize from API as fallback
  const getParticipants = async () => {
    const res = await getMembers(roomId);
    if(!res) return;
    setParticipants(res.members || []);
  }

  useEffect(() => {
    getParticipants();

    if (!socket) return;

    const handleInitial = (data) => {
      if (data?.members) setParticipants(data.members);
      if (data?.editors) setEditorIds((data.editors || []).map(String));
      if (data?.admin) setAdminId(data.admin);
    };

    const handleMembersUpdated = (payload) => {
      setParticipants(payload?.members || []);
      if (payload?.editors) setEditorIds((payload.editors || []).map(String));
      if (payload?.admin) setAdminId(payload.admin);
    };

    const handleUserRemoved = ({ userId: removedId }) => {
      setParticipants((p) => p.filter(m => m._id !== removedId));
    };

    socket.on('initialState', handleInitial);
    socket.on('members-updated', handleMembersUpdated);
    socket.on('userRemoved', handleUserRemoved);

    return () => {
      socket.off('initialState', handleInitial);
      socket.off('members-updated', handleMembersUpdated);
      socket.off('userRemoved', handleUserRemoved);
    }
  }, [socket])

  const handleGiveAccess = (member) => {
    if (roomAdmin !== user._id) {
      toast.error('Only owner can give access');
      return;
    }
    if (!socket) return;
    socket.emit('give-access', { roomId, email: member.email });
  }

  const handleRevokeAccess = (member) => {
    if (roomAdmin !== user._id) {
      toast.error('Only owner can revoke access');
      return;
    }
    if (!socket) return;
    socket.emit('revoke-access', { roomId, userId: member._id });
  }

  const handleRemoveUser = (member) => {
    if (roomAdmin !== user._id) {
      toast.error('Only owner can remove users');
      return;
    }
    if (!socket) return;
    socket.emit('remove-user', { roomId, userId: member._id });
  }
  

  return (
    <div className=' h-full w-full px-4 relative '>
      <SquareX onClick={() => dispatch(toggleSidebar())} className=' absolute top-2 right-2 cursor-pointer'/>

      <div className='flex justify-center font-semibold text-lg pb-1 '>Participants</div>
      <div className=' h-[80%] w-full flex flex-col gap-4 overflow-y-auto  '>
        {
          participants.map((member, index) => {
            return (
              <div key={index} className=' w-full flex items-center gap-6'>
                <div className=' border-2 border-transparent bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] rounded-full'>
                  <Avatar className="rounded-full">
                    <AvatarImage src={member?.imageUrl} />
                    <AvatarFallback>{member?.firstName?.slice(0, 1)}{member?.lastName?.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className='flex-1'>
                  <div className='text-xl font-semibold'>
                    {member?.firstName} {member?.lastName} {member._id == userId ? " (You)" : ""}
                  </div>
                  <div className='text-xs text-slate-400'>
                    {member._id === adminId ? 'Owner' : editorIds.includes(member._id) ? 'Editor' : 'Viewer'}
                  </div>
                </div>
                {roomAdmin === user._id && member._id !== userId && (
                  <div className=' flex gap-2'>
                    {!editorIds.includes(member._id) ? (
                      <button onClick={() => handleGiveAccess(member)} className=' text-sm px-2 py-1 bg-green-600 rounded text-white'>Give Access</button>
                    ) : (
                      <button onClick={() => handleRevokeAccess(member)} className=' text-sm px-2 py-1 bg-yellow-600 rounded text-white'>Revoke</button>
                    )}
                    <button onClick={() => handleRemoveUser(member)} className=' text-sm px-2 py-1 bg-red-600 rounded text-white'>Remove</button>
                  </div>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default Participants
