'use client';

import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

interface VoiceChatProps {
  roomName: string;
  identity?: string;
}

export default function VoiceChat({ roomName, identity }: VoiceChatProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  // Clean up room on unmount
  useEffect(() => {
    return () => {
      room?.disconnect();
    };
  }, [room]);

  const handleConnect = async () => {
    if (!url) {
      setError('Missing LiveKit URL. Check NEXT_PUBLIC_LIVEKIT_URL.');
      return;
    }
    if (!roomName) {
      setError('No room name provided.');
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);

      // Derive a stable identity: wallet address, fallback to random guest id
      const id = identity || `guest-${Math.random().toString(36).slice(2, 8)}`;

      // Fetch a fresh signed token from the server
      const res = await fetch(
        `/api/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(id)}`
      );
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Token fetch failed' }));
        setError(msg);
        return;
      }
      const { token } = await res.json();

      const newRoom = new Room();

      newRoom
        .on(RoomEvent.Connected, () => {
          setConnected(true);
          setParticipantCount(newRoom.numParticipants);
        })
        .on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setParticipantCount(0);
        })
        .on(RoomEvent.ParticipantConnected, () => {
          setParticipantCount(newRoom.numParticipants);
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          setParticipantCount(newRoom.numParticipants);
        });

      await newRoom.connect(url, token);
      setRoom(newRoom);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to connect');
      setConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = () => {
    room?.disconnect();
    setConnected(false);
    setParticipantCount(0);
    setRoom(null);
  };

  return (
    <div className="flex items-center gap-2">
      {!connected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          {isConnecting ? '…' : '🎙 Voice'}
        </button>
      ) : (
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 rounded-md bg-emerald-900/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/80"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Voice ({participantCount})
        </button>
      )}

      {error && (
        <span className="text-[10px] text-red-400" title={error}>!</span>
      )}

      {room && <RoomAudioRenderer room={room} />}
    </div>
  );
}
