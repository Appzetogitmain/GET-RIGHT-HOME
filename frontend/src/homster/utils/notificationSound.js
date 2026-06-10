// Notification Sound Utility
// Plays notification sound when new booking request arrives

let audioContext = null;
let notificationSound = null;

// Initialize audio context
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

// Create a premium notification sound (Major Chord / Chime)
const createNotificationSound = (type = 'chime') => {
  if (!audioContext) initAudio();

  const primaryGain = audioContext.createGain();
  primaryGain.connect(audioContext.destination);

  const playTone = (freq, type, startTime, duration, vol) => {
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(g);
    g.connect(primaryGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const now = audioContext.currentTime;

  if (type === 'chime') {
    // Richer chime using harmonics (C5, E5, G5)
    playTone(523.25, 'sine', now, 0.6, 0.2); // C5
    playTone(659.25, 'sine', now + 0.05, 0.5, 0.15); // E5
    playTone(783.99, 'sine', now + 0.1, 0.4, 0.1); // G5
  } else if (type === 'beep') {
    playTone(880, 'sine', now, 0.2, 0.2);
  } else if (type === 'ring') {
    // A more urgent "Electronic Ring"
    playTone(660, 'triangle', now, 0.1, 0.15);
    playTone(880, 'triangle', now + 0.1, 0.1, 0.15);
  }

  return primaryGain;
};

// Play notification sound (Premium Chime)
// Play notification sound (Premium Alert)
export const playNotificationSound = async () => {
  try {
    initAudio();

    // Ensure AudioContext is running (fix for 'suspended' state restriction)
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn('Could not resume audio context:', e);
      }
    }

    // Play a sequence of tones for a more distinct alert
    const now = audioContext.currentTime;

    // Main chime (Louder and Clearer C Major 7th)
    const tones = [
      { freq: 523.25, time: 0, dur: 0.8 },   // C5
      { freq: 659.25, time: 0.1, dur: 0.8 }, // E5
      { freq: 783.99, time: 0.2, dur: 0.8 }, // G5
      { freq: 987.77, time: 0.3, dur: 1.0 }  // B5
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Increased Volume
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.4, now + time + 0.05); // Faster attack, louder peak
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + dur);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });

    return true;
  } catch (error) {
    console.error('Error playing notification sound:', error);
    return false;
  }
};

// Play single beep for small interactions
export const playSingleBeep = () => {
  try {
    initAudio();
    createNotificationSound('beep');
    return true;
  } catch (error) {
    console.error('Error playing beep:', error);
    return false;
  }
};

// Play urgent ring for booking alerts
let currentAudio = null; // Global variable to track current playing audio
let alertInterval = null; // Global variable to track synthesizer interval

export const playAlertRing = (loop = false) => {
  try {
    stopAlertRing();

    const audio = new Audio('/booking-alert.mp3');
    if (loop) audio.loop = true;
    currentAudio = audio; // Track the new audio instance

    audio.play().catch(e => {
      console.warn('External audio file not found/allowed, falling back to Web Audio API synthesis:', e);
      
      // Synthesized Fallback: Play urgent ringing tones
      initAudio();
      
      const playSynthRing = () => {
        if (!audioContext) return;
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(e => console.warn('Could not resume AudioContext:', e));
        }
        
        const now = audioContext.currentTime;
        // Pleasant modern ringtone sequence (similar to a smartphone ring)
        const pulseTones = [
          { freq: 659.25, time: 0, dur: 0.2 },     // E5
          { freq: 880.00, time: 0.15, dur: 0.2 },  // A5
          { freq: 1046.50, time: 0.3, dur: 0.2 },  // C6
          { freq: 1318.51, time: 0.45, dur: 0.4 }  // E6
        ];

        pulseTones.forEach(({ freq, time, dur }) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.type = 'sine'; // Sine wave is softer and more pleasant
          osc.frequency.setValueAtTime(freq, now + time);

          // Fast attack, slow decay for a "bell" or "marimba" sound
          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.5, now + time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + dur);

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
      };

      playSynthRing();
      if (loop) {
        alertInterval = setInterval(playSynthRing, 1200);
      }
    });

    // Cleanup when audio finishes (if not looping)
    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };

    return true;
  } catch (error) {
    console.error('Error in playAlertRing:', error);
    return false;
  }
};

export const stopAlertRing = () => {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (err) {}
    currentAudio = null;
  }
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
};

// Check if sound is enabled in settings
export const isSoundEnabled = (userType = 'vendor') => {
  let storageKey = 'vendorData';
  if (userType === 'user') storageKey = 'userData';
  else if (userType === 'worker') storageKey = 'workerData';
  else if (userType === 'admin') storageKey = 'adminData';

  const dataString = localStorage.getItem(storageKey);
  if (dataString) {
    try {
      const data = JSON.parse(dataString);
      return data.settings?.soundAlerts !== false; // Default true
    } catch (error) {
      return true;
    }
  }
  return true;
};

export default {
  playNotificationSound,
  playSingleBeep,
  playAlertRing,
  isSoundEnabled
};

