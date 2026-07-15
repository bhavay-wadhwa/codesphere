import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import React, { useEffect, useState } from 'react'
import {SquareX} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleSidebar } from '@/features/EditorSlice/sidebarSlice.js'
import { openRemoteEditor } from '@/features/EditorSlice/remoteEditorSlice'
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
    };

    const handleMembersUpdated = (members) => {
      setParticipants(members || []);
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
                <div className='text-xl font-semibold flex-1'>{member?.firstName} {member?.lastName} {member._id == userId ? " (You)" : ""}</div>
                {roomAdmin === user._id && member._id !== userId && (
                  <div className=' flex gap-2'>
                    <button onClick={() => handleGiveAccess(member)} className=' text-sm px-2 py-1 bg-green-600 rounded text-white'>Give Access</button>
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
