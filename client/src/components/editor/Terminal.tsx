"use client"
import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css'; // Import the CSS for styling
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { buildPtyUrl } from '@/lib/pty';

const TerminalComponent = ({ params }: { params: ProjectParams }) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!terminalRef.current || typeof window === 'undefined') return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    term.open(terminalRef.current);

    const labId = params?.labId;
    if (!labId || labId === '') {
      term.writeln('No lab ID provided. Terminal unavailable.');
      return;
    }

    // Determine protocol based on current page
    let socket: WebSocket | null = null;
    try {
      const ptyUrl = buildPtyUrl(labId);
      socket = new WebSocket(ptyUrl);
    } catch (e) {
      console.error('Terminal socket creation error', e);
    }

    if (!socket) {
      term.writeln('Failed to create terminal connection.');
      return;
    }

    // When the connection opens, print a welcome message
    socket.onopen = () => {
      term.writeln('Welcome to DevsArena!');
      term.writeln('You can now run commands in your workspace.');
      term.writeln('');
    };

    // When a message is received from the Go backend, write it to the terminal
    socket.onmessage = (event) => {
      term.write(event.data);
    };

    // When the user types in the terminal, send the data to the Go backend
    const onData = (data: string) => {
      const message = JSON.stringify({ data });
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    };
    term.onData(onData);

    // Handle connection closing
    socket.onclose = (event) => {
      if (event.code !== 1000) {
        term.writeln('');
        term.writeln('Connection to terminal lost. Reconnecting...');
      }
    };

    // Handle errors
    socket.onerror = (error) => {
      term.writeln('Terminal connection error occurred.');
    };

    // Clean up on component unmount
    return () => {
      try {
        if (socket) {
          socket.close();
        }
      } catch {}
      try {
        term.dispose();
      } catch {}
    };
  }, [params?.labId]);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default TerminalComponent;