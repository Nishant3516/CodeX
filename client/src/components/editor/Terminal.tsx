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
    let currentSocket: WebSocket | null = null;
    let isReconnecting = false;
    let reconnectionAttempts = 0;
    const maxReconnectionAttempts = 5;
    const reconnectionDelay = 2000; // 2 seconds
    let messageTimeout: NodeJS.Timeout | null = null;

    // Attach onData once
    const onData = (data: string) => {
      const message = JSON.stringify({ data });
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(message);
      }
    };
    term.onData(onData);

    const createSocket = () => {
      try {
        const ptyUrl = buildPtyUrl(labId);
        currentSocket = new WebSocket(ptyUrl);
        setupSocketHandlers();
      } catch (e) {
        console.error('Terminal socket creation error', e);
      }
    };

    const setupSocketHandlers = () => {
      if (!currentSocket) return;

      // When the connection opens, print a welcome message
      currentSocket.onopen = () => {
        if (isReconnecting) {
          term.writeln('Reconnected to terminal.');
          isReconnecting = false;
          reconnectionAttempts = 0;
          if (messageTimeout) {
            clearTimeout(messageTimeout);
            messageTimeout = null;
          }
        } else {
          term.writeln('Welcome to DevsArena!');
          term.writeln('You can now run commands in your workspace.');
          term.writeln('');
        }
      };

      // When a message is received from the Go backend, write it to the terminal
      currentSocket.onmessage = (event) => {
        term.write(event.data);
      };

      // Handle connection closing
      currentSocket.onclose = (event) => {
        if (event.code !== 1000) {
          isReconnecting = true;
          reconnectionAttempts++;

          if (reconnectionAttempts <= maxReconnectionAttempts) {
            // Show message after a delay
            messageTimeout = setTimeout(() => {
              if (isReconnecting) {
                term.writeln('');
                term.writeln('Connection to terminal lost. Reconnecting...');
              }
            }, 1000); // 1 second delay

            // Attempt to reconnect after delay
            setTimeout(() => {
              if (isReconnecting) {
                createSocket();
              }
            }, reconnectionDelay);
          } else {
            term.writeln('');
            term.writeln('Failed to reconnect after multiple attempts. Please refresh the page.');
            isReconnecting = false;
          }
        }
      };

      // Handle errors
      currentSocket.onerror = (error) => {
        term.writeln('Terminal connection error occurred.');
      };
    };

    createSocket();

    // Clean up on component unmount
    return () => {
      try {
        if (currentSocket) {
          currentSocket.close();
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