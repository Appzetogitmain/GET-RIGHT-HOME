// Notification Sound Utility
// Plays notification sound when new booking request arrives

let audioContext = null;
let notificationSound = null;

// Auto-unlock AudioContext on user interaction across the browser session
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    } catch (e) {}
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudioContext, { once: false, passive: true });
  });
}

// Initialize audio context
const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
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

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

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
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(0.4, now + time + 0.05); // Faster attack, louder peak
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

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

// Play cheerful ascending chime when admin approves worker offline leave
export const playApprovalSuccessSound = async () => {
  try {
    initAudio();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
    const now = audioContext.currentTime;
    console.log('🔊 [Audio] Playing Worker Approval Success Sound');

    // Bright, uplifting 4-tone C-Major chord chime
    const tones = [
      { freq: 523.25, time: 0.0, dur: 0.25, vol: 0.45, type: 'triangle' }, // C5
      { freq: 659.25, time: 0.12, dur: 0.25, vol: 0.45, type: 'sine' },     // E5
      { freq: 783.99, time: 0.24, dur: 0.32, vol: 0.5, type: 'sine' },      // G5
      { freq: 1046.50, time: 0.38, dur: 0.75, vol: 0.55, type: 'sine' }     // C6 (bright triumph finish)
    ];

    tones.forEach(({ freq, time, dur, vol, type = 'sine' }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
    return true;
  } catch (error) {
    console.error('Error playing approval sound:', error);
    return false;
  }
};

// Play subtle descending notification when admin rejects request
export const playRejectionSound = async () => {
  try {
    initAudio();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
    const now = audioContext.currentTime;
    console.log('🔊 [Audio] Playing Worker Rejection Sound');

    // Distinct gentle descending tones (E5 -> C5 -> A4)
    const tones = [
      { freq: 659.25, time: 0.0, dur: 0.25, vol: 0.45, type: 'triangle' }, // E5
      { freq: 523.25, time: 0.18, dur: 0.3, vol: 0.4, type: 'triangle' },   // C5
      { freq: 440.00, time: 0.38, dur: 0.55, vol: 0.45, type: 'sine' }      // A4
    ];

    tones.forEach(({ freq, time, dur, vol, type = 'sine' }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
    return true;
  } catch (error) {
    console.error('Error playing rejection sound:', error);
    return false;
  }
};

// Play distinct attention chime for admin when a new offline request arrives
export const playAdminOfflineAlertSound = async () => {
  try {
    initAudio();
    if (audioContext.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
    const now = audioContext.currentTime;
    console.log('🔊 [Audio] Playing Admin Offline Request Alert Sound');

    // Rich 2-stage double-ping chime for Admin attention:
    // Ping 1 (A5 -> D6) + Ping 2 (A5 -> E6)
    const tones = [
      // First ping
      { freq: 880.00, time: 0.0, dur: 0.2, vol: 0.5, type: 'triangle' },   // A5
      { freq: 1174.66, time: 0.12, dur: 0.35, vol: 0.55, type: 'sine' },    // D6
      // Second ping (higher harmonic finish)
      { freq: 880.00, time: 0.36, dur: 0.2, vol: 0.5, type: 'triangle' },  // A5
      { freq: 1318.51, time: 0.48, dur: 0.65, vol: 0.6, type: 'sine' }     // E6
    ];

    tones.forEach(({ freq, time, dur, vol, type = 'sine' }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
    return true;
  } catch (error) {
    console.error('Error playing admin alert sound:', error);
    return false;
  }
};

// Play urgent ring for booking alerts
let currentAudio = null; // Global variable to track current playing audio
let alertInterval = null; // Global variable to track synthesizer interval

// Identifies the most recent play/stop request.
//
// audio.play() rejects ASYNCHRONOUSLY when the mp3 is missing or autoplay is
// blocked, and the synth-fallback interval is started inside that .catch. So a
// stopAlertRing() that ran in between — e.g. the worker rejecting the job —
// could be immediately undone by a late callback installing a fresh interval,
// leaving a ring nothing held a reference to and no way to silence it.
// Every callback now checks it still owns the current token before starting,
// and stopAlertRing() invalidates any in-flight one by bumping it.
let ringToken = 0;

export const playAlertRing = (loop = false) => {
  try {
    stopAlertRing();

    const myToken = ++ringToken;

    const audio = new Audio('/booking-alert.mp3');
    if (loop) audio.loop = true;
    currentAudio = audio; // Track the new audio instance

    audio.play().catch(e => {
      // Superseded by a newer ring, or already stopped — don't start anything.
      if (myToken !== ringToken) return;
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
        // Re-check: stopAlertRing() may have run while the tones above were
        // being scheduled.
        if (myToken !== ringToken) return;
        alertInterval = setInterval(() => {
          // Belt and braces — if this interval somehow outlives its token,
          // it clears itself instead of ringing forever.
          if (myToken !== ringToken) {
            clearInterval(alertInterval);
            alertInterval = null;
            return;
          }
          playSynthRing();
        }, 1200);
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
  // Invalidate any play() rejection still in flight so it can't resurrect the
  // ring after this point.
  ringToken++;

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
export const isSoundEnabled = (userType = 'user') => {
  try {
    let dataString = null;
    if (userType === 'worker') {
      dataString = localStorage.getItem('workerData');
    } else if (userType === 'admin') {
      dataString = localStorage.getItem('adminData') || localStorage.getItem('adminUser') || sessionStorage.getItem('adminData');
    } else {
      dataString = localStorage.getItem('userData') || localStorage.getItem('user');
    }

    if (dataString) {
      const data = JSON.parse(dataString);
      return data.settings?.soundAlerts !== false; // Default true
    }
  } catch (error) {
    return true;
  }
  return true;
};

export default {
  playNotificationSound,
  playSingleBeep,
  playAlertRing,
  playApprovalSuccessSound,
  playRejectionSound,
  playAdminOfflineAlertSound,
  isSoundEnabled
};

