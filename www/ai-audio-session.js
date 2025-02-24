/* globals App */
"use strict";

function createAIAudioSession() {
  // Use App's reactive system since we're not using Vue's Composition API
  if (!App.aiSessionStatus) App.aiSessionStatus = 'idle';
  if (!App.aiPeerConnection) App.aiPeerConnection = null;
  if (!App.aiRemoteStream) App.aiRemoteStream = null;
  if (!App.aiAudioElement) App.aiAudioElement = null;
  if (!App.aiAudioContext) App.aiAudioContext = null;
  if (!App.aiAudioProcessor) App.aiAudioProcessor = null;
  if (!App.aiDataChannel) App.aiDataChannel = null;

  async function startAIAudioSession() {
    try {
      App.aiSessionStatus = 'connecting';
      console.log('Starting AI audio session...');
      
      // Get microphone access
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Got microphone access');

      // Create RTCPeerConnection for AI audio only
      console.log('Creating RTCPeerConnection...');
      App.aiPeerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { 
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      });

      // Monitor connection state
      App.aiPeerConnection.onconnectionstatechange = () => {
        console.log('WebRTC Connection state changed to:', App.aiPeerConnection.connectionState);
        switch(App.aiPeerConnection.connectionState) {
          case 'connected':
            console.log('WebRTC fully connected!');
            break;
          case 'failed':
            console.error('WebRTC connection failed');
            App.setToast('Connection failed - please try again');
            stopAIAudioSession();
            break;
        }
      };

      App.aiPeerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection state changed to:', App.aiPeerConnection.iceConnectionState);
        if (App.aiPeerConnection.iceConnectionState === 'connected') {
          console.log('ICE Connection established successfully!');
        }
      };

      // Set up data channel
      console.log('Setting up data channel...');
      const dataChannel = App.aiPeerConnection.createDataChannel("response");
      App.aiDataChannel = dataChannel;
      
      dataChannel.onopen = () => {
        console.log('Data channel opened - Ready for communication!');
        
        // Send session configuration
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              create_response: false,
            },
          },
        };
        App.aiDataChannel.send(JSON.stringify(sessionUpdate));
        console.log('Sent session configuration');
        
        App.setToast('AI Assistant ready for interaction', 'success');
      };
      
      dataChannel.onmessage = (event) => {
        console.log('Data channel message:', event.data);
        const msg = JSON.parse(event.data);
        
        // When we get a final transcription, request a response
        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('Requesting AI response...');
          App.aiDataChannel.send(JSON.stringify({
            type: 'response.create'
          }));
        }
      };

      // Handle incoming audio from AI
      App.aiPeerConnection.ontrack = (event) => {
        App.aiRemoteStream = event.streams[0];
        if (!App.aiAudioElement) {
          App.aiAudioElement = new Audio();
          App.aiAudioElement.volume = 1.0;  // Ensure volume is up
        }
        App.aiAudioElement.srcObject = App.aiRemoteStream;
        console.log('Playing AI audio stream...');
        App.aiAudioElement.play().catch(error => {
          console.error('Error playing AI audio:', error);
          App.setToast('Error playing AI audio');
        });
      };

      // Add local audio track
      stream.getAudioTracks().forEach(track => {
        App.aiPeerConnection.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await App.aiPeerConnection.createOffer();
      await App.aiPeerConnection.setLocalDescription(offer);

      // Get session token from our server
      const response = await fetch('/api/ai-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get AI session token');
      }

      const sessionData = await response.json();

      // Send offer to OpenAI
      const baseUrl = "https://api.openai.com/v1/realtime";
      console.log('Sending offer to OpenAI...');
      const openaiResponse = await fetch(`${baseUrl}?model=gpt-4o-realtime-preview-2024-12-17&voice=${App.selectedVoice || 'alloy'}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${sessionData.client_secret.value}`,
          "Content-Type": "application/sdp",
        },
      });
      console.log('Got response from OpenAI');

      // Set remote description from OpenAI's answer
      const answerSdp = await openaiResponse.text();
      if (!answerSdp.startsWith('v=')) {
        throw new Error('Invalid SDP received from OpenAI');
      }
      await App.aiPeerConnection.setRemoteDescription({ 
        type: "answer", 
        sdp: answerSdp 
      });

      App.aiSessionStatus = 'connected';
      App.setToast('AI Assistant connected', 'success');

    } catch (error) {
      App.aiSessionStatus = 'error';
      console.error('Error starting AI audio session:', error);
      App.setToast('Failed to start AI session');
      throw error;
    }
  }

  function stopAIAudioSession() {
    console.log('Stopping AI audio session...');
    App.aiSessionStatus = 'idle';

    if (App.aiPeerConnection) {
      console.log('Closing peer connection...');
      App.aiPeerConnection.close();
      App.aiPeerConnection = null;
    }

    if (App.aiDataChannel) {
      console.log('Closing data channel...');
      App.aiDataChannel.close();
      App.aiDataChannel = null;
    }

    if (App.aiAudioElement) {
      console.log('Cleaning up audio element...');
      App.aiAudioElement.pause();
      App.aiAudioElement.srcObject = null;
      App.aiAudioElement = null;
    }

    if (App.aiAudioContext) {
      console.log('Closing audio context...');
      App.aiAudioContext.close();
      App.aiAudioContext = null;
    }

    if (App.aiAudioProcessor) {
      console.log('Disconnecting audio processor...');
      App.aiAudioProcessor.disconnect();
      App.aiAudioProcessor = null;
    }

    App.aiRemoteStream = null;
    console.log('AI audio session stopped');
    App.setToast('AI Assistant disconnected');
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', stopAIAudioSession);

  return {
    startAIAudioSession,
    stopAIAudioSession
  };
}

// Export for global use
window.createAIAudioSession = createAIAudioSession; 