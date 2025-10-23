import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// --- Icônes SVG (embarquées pour un seul fichier) ---

const PlayIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const PauseIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const SkipBackIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);

const SkipForwardIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const Volume2Icon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);

const ShuffleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="16 21 21 21 21 16"></polyline>
    <line x1="4" y1="4" x2="15" y2="15"></line>
  </svg>
);

const RepeatIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const SpotifyIcon = (props) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.889 13.75c-.2.3-.58.4- .88.2-2.4-1.5-5.4-1.8-8.9-.9-.3.1-.6-.1-.7-.4s.1-.6.4-.7c3.8-.9 7.1-.6 9.8.9.3.2.4.5.2.8zm.8-2.2c-.2.4-.7.5-1.1.3-2.7-1.7-6.8-2.2-10-1.2-.4.1-.8-.2-1-.6s.2-.8.6-1c3.6-1.1 8.1-.6 11.2 1.3.4.2.5.7.3 1.2zm.1-2.3c-3.2-2-8.5-2.5-11.8-1.4-.5.2-1-.1-1.2-.6s.1-1 .6-1.2C15.9 5 21.7 5.6 25.4 7.8c.5.3.6 1 .3 1.5s-1 .6-1.5.3z"/>
  </svg>
);

// --- Variables de configuration (À REMPLACER) ---

// REMPLACEZ CECI par votre propre Client ID Spotify
const SPOTIFY_CLIENT_ID = "VOTRE_CLIENT_ID_SPOTIFY_ICI"; 
// L'URL où votre app est hébergée (doit être listée dans votre Spotify App Dashboard)
const REDIRECT_URI = window.location.origin + window.location.pathname;

// --- Données pour le Mode Démo ---
const DEMO_TRACK = {
  id: "demo_track_001",
  title: "Mode Démo",
  artist: "Gemini Web Radio",
  album: "Chill Beats",
  albumArtUrl: "https://placehold.co/640x640/2B3645/F6EAF8?text=Demo",
  duration_ms: 60000, // 1 minute
  is_playing: false,
};

// --- Composant Fond Animé (three.js + Shader) ---

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_intensity;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  
  // Fonction de bruit simple (pseudo-aléatoire)
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  // Bruit de "valeur"
  float valueNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
  }

  void main() {
    // Échelle pour le bruit
    vec2 scaledUv = vUv * 4.0;
    
    // Animer le bruit avec le temps
    float noise = valueNoise(scaledUv + vec2(u_time * 0.1, u_time * 0.05));
    
    // Créer un effet de vagues douces
    float wave = (sin(vUv.y * 10.0 + u_time * 0.5 + noise * 2.0) + 1.0) / 2.0;
    
    // Appliquer l'intensité (réactivité audio)
    // u_intensity est une moyenne de 0.0 à 1.0
    float intensityEffect = u_intensity * 0.5 + 0.5; // Mettre à l'échelle pour un effet visible
    
    // Mélanger les couleurs
    vec3 color = mix(u_color1, u_color2, wave * intensityEffect);
    
    // Assombrir les bords
    float vignette = smoothstep(0.8, 0.4, length(vUv - vec2(0.5)));
    
    gl_FragColor = vec4(color * (vignette + 0.2), 1.0);
  }
`;

const AnimatedBackground = ({ isPlaying, audioData }) => {
  const mountRef = useRef(null);
  const animationFrameId = useRef(null);
  const threeObjects = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialisation
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1;
    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Géométrie
    const geometry = new THREE.PlaneGeometry(2.5, 2.5);
    const uniforms = {
      u_time: { value: 0.0 },
      u_intensity: { value: 0.0 },
      // Couleurs de base de la palette
      u_color1: { value: new THREE.Color("#2B3645") }, // Bleu gris
      u_color2: { value: new THREE.Color("#0d9488") }, // Teal (accent)
    };
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Enregistrer les objets pour l'animation et le nettoyage
    threeObjects.current = { renderer, scene, camera, material, clock: new THREE.Clock() };

    // Gestion du redimensionnement
    const handleResize = () => {
      if (threeObjects.current) {
        threeObjects.current.camera.aspect = window.innerWidth / window.innerHeight;
        threeObjects.current.camera.updateProjectionMatrix();
        threeObjects.current.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Boucle d'animation
    const animate = () => {
      if (!threeObjects.current) return;
      
      const { renderer, scene, camera, material, clock } = threeObjects.current;
      
      material.uniforms.u_time.value = clock.getElapsedTime();

      let intensity = 0.0;
      if (isPlaying && audioData && audioData.length > 0) {
        // Calculer l'amplitude moyenne à partir des données de l'analyseur
        intensity = audioData.reduce((a, b) => a + b, 0) / (audioData.length * 255); // Normaliser (0 à 1)
      } else if (isPlaying) {
        // Fallback pour le SDK Spotify (pas d'analyseur) : pulsation simple
        intensity = (Math.sin(clock.getElapsedTime() * 2.0) + 1.0) / 4.0 + 0.1; // 0.1 à 0.6
      }
      
      // Lisser la valeur pour éviter les sauts brusques
      material.uniforms.u_intensity.value = THREE.MathUtils.lerp(
        material.uniforms.u_intensity.value,
        intensity,
        0.1 
      );

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    animate();

    // Nettoyage
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      threeObjects.current = null;
    };
  }, []); // Exécuter une seule fois

  return <div ref={mountRef} className="absolute inset-0 -z-10 w-full h-full overflow-hidden" />;
};


// --- Utilitaire : Extraire la couleur dominante (simplifié) ---
// Note : Ceci nécessite que l'image de Spotify soit servie avec CORS: Anonymous
const extractDominantColor = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        let count = 0;

        // Échantillonner les pixels pour la performance
        for (let i = 0; i < data.length; i += 4 * 10) { // Échantillonne 1 pixel sur 10
          if (data[i+3] > 200) { // Ignorer les pixels transparents
            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
          }
        }
        
        if (count > 0) {
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          resolve(`rgb(${r}, ${g}, ${b})`);
        } else {
          resolve(null); // Pas de pixels valides trouvés
        }
      } catch (e) {
        console.error("Erreur d'extraction de couleur (problème CORS probable):", e);
        reject(e);
      }
    };
    img.onerror = (e) => {
       console.error("Erreur de chargement d'image (CORS?):", e);
       reject(e);
    };
    img.src = imageUrl;
  });
};


// --- Composant Principal : App ---
export default function App() {
  const [mode, setMode] = useState('demo'); // 'demo' ou 'spotify'
  const [token, setToken] = useState(null);
  const [codeVerifier, setCodeVerifier] = useState(null);
  
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  
  const [currentTrack, setCurrentTrack] = useState(DEMO_TRACK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [accentColor, setAccentColor] = useState("#0d9488"); // Teal par défaut
  
  // État pour le mode démo (Web Audio API)
  const demoAudioRef = useRef(null);
  const [audioData, setAudioData] = useState(null);
  const progressIntervalRef = useRef(null);

  // --- 1. Logique d'authentification (PKCE) ---

  // Génère le 'code_verifier' et 'code_challenge' pour PKCE
  const generatePkce = async () => {
    const generateRandomString = (length) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let text = '';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    const sha256 = async (plain) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest('SHA-256', data);
    };

    const base64encode = (input) => {
      return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const verifier = generateRandomString(64);
    const hashed = await sha256(verifier);
    const challenge = base64encode(hashed);
    
    return { verifier, challenge };
  };

  // Redirige l'utilisateur vers la page d'autorisation Spotify
  const redirectToAuthCodeFlow = async () => {
    if (SPOTIFY_CLIENT_ID === "VOTRE_CLIENT_ID_SPOTIFY_ICI") {
      // Remplacé alert() par console.warn() pour éviter de bloquer l'interface
      console.warn("Veuillez définir votre 'SPOTIFY_CLIENT_ID' dans le code (ligne 116). L'authentification va échouer.");
      return;
    }

    const { verifier, challenge } = await generatePkce();
    
    // Sauvegarder le verifier pour l'échange de token
    localStorage.setItem("spotify_code_verifier", verifier);
    setCodeVerifier(verifier);

    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("response_type", "code");
    params.append("redirect_uri", REDIRECT_URI);
    params.append("scope", "streaming user-read-email user-read-private user-library-read user-read-playback-state user-modify-playback-state");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  // Échange le 'code' contre un 'access_token'
  const getAccessToken = useCallback(async (code, verifier) => {
    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("code_verifier", verifier);

    try {
      const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!result.ok) {
        throw new Error(`Erreur HTTP: ${result.status}`);
      }
      
      const { access_token } = await result.json();
      setToken(access_token);
      localStorage.setItem("spotify_access_token", access_token);
      
      // Nettoyer l'URL
      window.history.pushState({}, null, REDIRECT_URI);
      localStorage.removeItem("spotify_code_verifier");

    } catch (error) {
      console.error("Échec de l'obtention du token:", error);
      // Gérer l'échec, peut-être en nettoyant le verifier local
      localStorage.removeItem("spotify_code_verifier");
      setCodeVerifier(null);
    }
  }, []);

  // Effet pour gérer le flux d'authentification au chargement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const localVerifier = localStorage.getItem("spotify_code_verifier");

    if (code && localVerifier) {
      // Étape 2 : Échange du code
      setMode('spotify');
      getAccessToken(code, localVerifier);
    } else {
      // Vérifier si un token existe déjà (session précédente)
      const localToken = localStorage.getItem("spotify_access_token");
      if (localToken) {
          setMode('spotify');
          setToken(localToken);
      }
      // Sinon, on reste en mode démo
    }
  }, [getAccessToken]);
  
  
  // --- 2. Logique du SDK Spotify ---

  // Charge le script du SDK
  useEffect(() => {
    if (mode !== 'spotify') return;

    const script = document.createElement('script');
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    
    document.body.appendChild(script);

    // Le SDK Spotify appelle cette fonction globale
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify SDK prêt.");
      // L'initialisation se fera dans l'effet dépendant du 'token'
    };
    
    return () => {
      // Nettoyage
      if (script && document.body.contains(script)) {
         document.body.removeChild(script);
      }
      if (window.Spotify && player) {
        player.disconnect();
      }
    }
  }, [mode, player]); // 'player' est ajouté pour gérer la déconnexion

  // Initialise le lecteur une fois le SDK chargé ET le token obtenu
  useEffect(() => {
    if (mode === 'spotify' && token && window.Spotify) {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Gemini Web Radio',
        getOAuthToken: cb => { cb(token); },
        volume: volume
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Lecteur SDK connecté, Device ID:', device_id);
        setDeviceId(device_id);
        // Tenter de transférer la lecture vers ce nouvel appareil
        // fetch(`https://api.spotify.com/v1/me/player`, {
        //   method: 'PUT',
        //   body: JSON.stringify({ device_ids: [device_id], play: false }),
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${token}`
        //   }
        // });
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID non prêt (hors ligne?):', device_id);
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) {
          console.warn("État du lecteur SDK non disponible (probablement inactif).");
          // On pourrait vouloir afficher un état "Inactif"
          setIsPlaying(false);
          return;
        }

        const track = state.track_window.current_track;
        setCurrentTrack({
          id: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          albumArtUrl: track.album.images[0]?.url || DEMO_TRACK.albumArtUrl,
          duration_ms: track.duration_ms,
          is_playing: !state.paused,
        });
        
        setIsPlaying(!state.paused);
        setProgressMs(state.position);
        setVolume(state.volume); // Mettre à jour le volume si changé ailleurs
      });
      
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        // Corrigé : Remplacement des guillemets simples par des guillemets doubles pour éviter l'erreur de syntaxe
        console.error("Erreur d'initialisation:", message);
      });
      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        // Corrigé : Remplacement des guillemets simples par des guillemets doubles pour éviter l'erreur de syntaxe
        console.error("Erreur d'authentification:", message);
        // Le token a expiré ou est invalide
        setToken(null);
        localStorage.removeItem("spotify_access_token");
        // Forcer l'utilisateur à se reconnecter
      });
      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Erreur de compte (Premium requis?):', message);
      });

      spotifyPlayer.connect().then(success => {
        if (success) {
          console.log("Le SDK est connecté et prêt.");
        }
      });
      
      setPlayer(spotifyPlayer);
      
      return () => {
        console.log("Nettoyage du lecteur Spotify.");
        if (spotifyPlayer) {
          spotifyPlayer.disconnect();
        }
      }
    }
  }, [mode, token, volume]); // Ne pas inclure 'player' ici pour éviter boucle
  

  // --- 3. Logique du Mode Démo (Web Audio API) ---

  const setupDemoAudio = () => {
    if (demoAudioRef.current) {
        demoAudioRef.current.context.close();
    }
    
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const analyser = context.createAnalyser();

    analyser.fftSize = 64; // Petite taille pour la performance
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    oscillator.type = 'sine'; // Un son simple
    oscillator.frequency.setValueAtTime(261.63, context.currentTime); // C4
    gain.gain.setValueAtTime(0, context.currentTime); // Commence muet

    oscillator.connect(gain);
    gain.connect(analyser);
    analyser.connect(context.destination);
    
    oscillator.start();
    
    demoAudioRef.current = { context, oscillator, gain, analyser, dataArray, bufferLength };
  };

  const playDemo = () => {
    if (!demoAudioRef.current) {
      setupDemoAudio();
    }
    const { gain, context } = demoAudioRef.current;
    gain.gain.exponentialRampToValueAtTime(volume * 0.1, context.currentTime + 0.5); // Augmenter le volume (bas pour ne pas être agaçant)
    setIsPlaying(true);
  };
  
  const pauseDemo = () => {
    if (demoAudioRef.current) {
      const { gain, context } = demoAudioRef.current;
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5); // Baisser le volume
    }
    setIsPlaying(false);
  };
  
  // Boucle de l'analyseur pour le mode démo
  useEffect(() => {
    let animationFrameId;

    const visualizerLoop = () => {
      if (mode === 'demo' && isPlaying && demoAudioRef.current) {
        const { analyser, dataArray, bufferLength } = demoAudioRef.current;
        analyser.getByteFrequencyData(dataArray);
        setAudioData(new Uint8Array(dataArray)); // Cloner pour la prop React
      }
      animationFrameId = requestAnimationFrame(visualizerLoop);
    };

    visualizerLoop();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, isPlaying]);
  
  
  // --- 4. Mise à jour de l'interface ---

  // Extraction de la couleur d'accent
  useEffect(() => {
    if (currentTrack.albumArtUrl) {
      extractDominantColor(currentTrack.albumArtUrl)
        .then(color => {
          if (color) {
            setAccentColor(color);
            document.documentElement.style.setProperty('--accent-color', color);
          }
        })
        .catch(() => {
          setAccentColor("#0d9488"); // Fallback
          document.documentElement.style.setProperty('--accent-color', "#0d9488");
        });
    }
  }, [currentTrack.albumArtUrl]);
  
  // Gestion de la progression (mode démo et Spotify)
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (mode === 'demo') {
            setProgressMs(p => {
              const newProgress = p + 500;
              if (newProgress >= currentTrack.duration_ms) {
                pauseDemo(); // Arrêter à la fin
                return 0;
              }
              return newProgress;
            });
        } else {
            // En mode Spotify, le SDK met à jour la progression
            // Mais si le SDK est inactif (ex: lecture sur un autre appareil),
            // on pourrait vouloir un fallback. Pour l'instant, on se fie au SDK.
            // Si le SDK est actif, il pousse les états.
            // Si le SDK n'est pas le lecteur actif, 'player_state_changed' peut ne pas se déclencher.
            // Pour ce POC, on suppose que le SDK est le lecteur actif.
            
            // Solution simple : si le SDK est le lecteur, il pousse l'état.
            // Si la lecture est sur un autre appareil, on devrait *poller* /v1/me/player.
            // ... Mais pour cet exercice, on garde simple : le SDK gère tout.
            // ... MAIS 'player_state_changed' ne se déclenche que lors d'un *changement*.
            // On a besoin d'une mise à jour de la progression.
            
            // Le SDK 'player_state_changed' NE SE DECLENCHE PAS toutes les secondes.
            // On doit le simuler si on est le lecteur actif.
            if (player && deviceId) {
                 player.getCurrentState().then(state => {
                     if (state && !state.paused) {
                         setProgressMs(state.position);
                         setCurrentTrack(p => ({...p, is_playing: true}));
                         setIsPlaying(true);
                     } else if (state && state.paused) {
                         setIsPlaying(false);
                         setCurrentTrack(p => ({...p, is_playing: false}));
                     }
                 });
            }
        }
      }, 500); // Mettre à jour toutes les 500ms
    }

    return () => clearInterval(progressIntervalRef.current);
  }, [isPlaying, mode, currentTrack.duration_ms, player, deviceId]);


  // --- 5. Gestionnaires d'événements (Play, Pause, etc.) ---

  const handlePlayPause = () => {
    if (mode === 'demo') {
      if (isPlaying) pauseDemo();
      else playDemo();
    } 
    else if (player) {
      player.togglePlay().catch(e => console.error("Erreur togglePlay:", e));
    }
  };
  
  const handleNext = () => {
    if (mode === 'demo') {
      setProgressMs(0); // Simuler
    } else if (player) {
      player.nextTrack().catch(e => console.error("Erreur nextTrack:", e));
    }
  };
  
  const handlePrev = () => {
    if (mode === 'demo') {
      setProgressMs(0); // Simuler
    } else if (player) {
      player.previousTrack().catch(e => console.error("Erreur previousTrack:", e));
    }
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (mode === 'demo' && demoAudioRef.current) {
      demoAudioRef.current.gain.gain.setValueAtTime(newVolume * 0.1, demoAudioRef.current.context.currentTime);
    } else if (player) {
      player.setVolume(newVolume).catch(e => console.error("Erreur setVolume:", e));
    }
  };
  
  // Barre de progression (clic/drag)
  const progressBarRef = useRef(null);
  
  const handleSeek = (e) => {
    if (!progressBarRef.current) return;
    
    const bounds = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - bounds.left;
    const width = bounds.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newProgressMs = Math.floor(percentage * currentTrack.duration_ms);

    setProgressMs(newProgressMs);
    
    if (mode === 'demo') {
      // La simulation est gérée par la mise à jour de setProgressMs
    } else if (player) {
      player.seek(newProgressMs).catch(e => console.error("Erreur seek:", e));
    }
  };
  
  // Activer ce device (si le SDK est prêt mais pas actif)
  const handleActivateDevice = () => {
     if (!token || !deviceId) {
         // Remplacé alert() par console.warn()
         console.warn("Connexion à Spotify requise pour activer l'appareil.");
         return;
     }
     
     fetch(`https://api.spotify.com/v1/me/player`, {
       method: 'PUT',
       body: JSON.stringify({ device_ids: [deviceId], play: isPlaying }),
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       }
     }).catch(e => console.error("Erreur activation device:", e));
  };
  
  // --- 6. Rendu (JSX) ---

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = (progressMs / currentTrack.duration_ms) * 100;
  
  const renderPlayer = () => (
    <div className="w-full max-w-4xl p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-lg bg-gray-900/40 border border-white/10 text-white font-sans overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Pochette */}
        <div className="w-full md:w-64 lg:w-80 flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack.albumArtUrl}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="aspect-square rounded-xl shadow-lg"
              style={{
                backgroundImage: `url(${currentTrack.albumArtUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </AnimatePresence>
        </div>
        
        {/* Infos et Contrôles */}
        <div className="flex flex-col flex-1 justify-center min-w-0">
          
          {/* Infos Piste */}
          <div className="truncate">
            <motion.h2 
              key={currentTrack.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl lg:text-4xl font-bold truncate text-shadow"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </motion.h2>
            <motion.p 
              key={currentTrack.artist}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg lg:text-xl font-light italic opacity-80 truncate text-shadow-sm"
              title={currentTrack.artist}
            >
              {currentTrack.artist}
            </motion.p>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-6 mb-4">
            <div 
              ref={progressBarRef}
              className="w-full h-2 bg-white/20 rounded-full cursor-pointer group"
              onClick={handleSeek}
              role="slider"
              aria-label="Barre de progression"
              aria-valuemin="0"
              aria-valuemax={currentTrack.duration_ms}
              aria-valuenow={progressMs}
            >
              <motion.div 
                className="h-full rounded-full bg-[var(--accent-color)] group-hover:h-2.5 transition-all duration-200"
                style={{ 
                  width: `${progressPercent}%`,
                  backgroundColor: accentColor, // Fallback si var() échoue
                  boxShadow: `0 0 10px ${accentColor}, 0 0 5px ${accentColor}`
                }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>
            <div className="flex justify-between text-xs opacity-70 mt-2">
              <span>{formatTime(progressMs)}</span>
              <span>{formatTime(currentTrack.duration_ms)}</span>
            </div>
          </div>
          
          {/* Contrôles principaux */}
          <div className="flex items-center justify-between gap-4 mt-2">
            
            <div className="flex items-center gap-2 flex-1">
              {/* Outils (Shuffle, Repeat) - Côté gauche */}
              <motion.button 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.95 }}
                className="p-2 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Aléatoire"
                // onClick={handleToggleShuffle}
              >
                <ShuffleIcon className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.95 }}
                className="p-2 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Répéter"
                // onClick={handleToggleRepeat}
              >
                <RepeatIcon className="w-5 h-5" />
              </motion.button>
            </div>
            
            {/* Play/Pause/Skip - Centre */}
            <div className="flex items-center justify-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.9 }}
                className="p-2 opacity-80 hover:opacity-100 transition-opacity"
                onClick={handlePrev}
                aria-label="Piste précédente"
              >
                <SkipBackIcon className="w-6 h-6" />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300"
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Pause" : "Lecture"}
                style={{ 
                  backgroundColor: accentColor, 
                  boxShadow: `0 0 15px ${accentColor}` 
                }}
              >
                {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.9 }}
                className="p-2 opacity-80 hover:opacity-100 transition-opacity"
                onClick={handleNext}
                aria-label="Piste suivante"
              >
                <SkipForwardIcon className="w-6 h-6" />
              </motion.button>
            </div>
            
            {/* Volume - Côté droit */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <Volume2Icon className="w-5 h-5 opacity-70" />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 rounded-full appearance-none cursor-pointer bg-white/30"
                style={{ accentColor: accentColor }}
                aria-label="Volume"
              />
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
  
  const renderConnectButton = () => (
     <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Gemini Web Radio</h1>
        <p className="text-lg text-gray-300 mb-8">
          {mode === 'demo' ? "Vous êtes en mode démo." : "Connectez-vous à Spotify pour écouter."}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (mode === 'demo') {
              // Passer au mode Spotify
              redirectToAuthCodeFlow();
            } else {
              // Déjà en mode Spotify, mais pas de token
              redirectToAuthCodeFlow();
            }
          }}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-green-500 text-black font-bold rounded-full shadow-lg hover:bg-green-400 transition-colors"
        >
          <SpotifyIcon className="w-6 h-6 text-black" />
          {mode === 'demo' ? "Connecter Spotify" : "Se connecter"}
        </motion.button>
        {mode === 'spotify' && !deviceId &&
          <p className="text-sm text-gray-400 mt-4">En attente de l'initialisation du lecteur...</p>
        }
     </div>
  );
  
  const renderActivateButton = () => (
    <motion.button
      onClick={handleActivateDevice}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-6 left-6 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors"
      aria-label="Activer la lecture sur cet appareil"
    >
      Activer ce lecteur
    </motion.button>
  );

  return (
    <div className="relative w-full h-screen flex items-center justify-center p-4 overflow-hidden bg-gray-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Fond animé */}
      <AnimatedBackground 
        isPlaying={isPlaying} 
        audioData={audioData} // Ne fonctionne qu'en mode démo
      />
      
      {/* Bouton de mode */}
      <button
        onClick={() => {
          if (mode === 'demo') {
             if(token) setMode('spotify');
             else redirectToAuthCodeFlow();
          } else {
             setMode('demo');
             setCurrentTrack(DEMO_TRACK);
             setProgressMs(0);
             if (player) {
               player.pause(); // Mettre en pause Spotify si on passe en démo
             }
          }
        }}
        className="absolute top-6 right-6 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors"
      >
        {mode === 'demo' ? "Passer à Spotify" : "Passer en Démo"}
      </button>

      {/* Afficher le bouton d'activation si le SDK est prêt mais n'est pas l'appareil actif */}
      {mode === 'spotify' && token && deviceId && !currentTrack.is_playing && (
         renderActivateButton()
      )}

      {/* Contenu principal */}
      {(mode === 'demo' || (mode === 'spotify' && token))
        ? renderPlayer()
        : renderConnectButton()
      }
    </div>
  );
}


