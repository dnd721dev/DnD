'use client';

import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

export default function VoiceChat() {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
  const token = process.env.NEXT_PUBLIC_LIVEKIT_TOKEN || '';

  // Clean up room on unmount
  useEffect(() => {
    return () => {
      room?.disconnect();
    };
  }, [room]);

  const handleConnect = async () => {
    if (!url || !token) {
      setError('Missing LiveKit URL or token. Check your env vars.');
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);

      // Create a new LiveKit room instance
      const newRoom = new Room();

      // Track connection + participants
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
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Voice</div>
        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="btn"
          >
            {isConnecting ? 'Connecting...' : 'Join Room'}
          </button>
        ) : (
          <button onClick={handleLeave} className="btn">
            Leave
          </button>
        )}
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* This plays remote participants' audio */}
      {room && <RoomAudioRenderer room={room} />}

      <div className="text-xs text-neutral-400">
        Participants: {participantCount}
      </div>
    </div>
  );
}
