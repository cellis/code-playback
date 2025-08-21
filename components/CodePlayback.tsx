'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  vscDarkPlus,
  oneDark,
  materialDark,
  materialLight,
  dracula,
  atomDark,
  tomorrow,
  twilight,
  solarizedlight,
  solarizedDarkAtom,
  okaidia,
  nord,
  coldarkDark,
  coldarkCold,
  gruvboxDark,
  gruvboxLight,
  hopscotch,
  pojoaque,
  synthwave84,
  vs,
  xonokai
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Play, Pause, RotateCcw, Settings, Palette, Zap, ZapOff, ArrowDownToLine, Video, Square, Download } from 'lucide-react';

interface CodePlaybackProps {
  code: string;
  language: string;
  filename: string;
}

const themes = {
  'VS Code Dark': vscDarkPlus,
  'One Dark': oneDark,
  'Material Dark': materialDark,
  'Material Light': materialLight,
  'Dracula': dracula,
  'Atom Dark': atomDark,
  'Tomorrow': tomorrow,
  'Twilight': twilight,
  'Solarized Light': solarizedlight,
  'Solarized Dark': solarizedDarkAtom,
  'Okaidia': okaidia,
  'Nord': nord,
  'Coldark Dark': coldarkDark,
  'Coldark Cold': coldarkCold,
  'Gruvbox Dark': gruvboxDark,
  'Gruvbox Light': gruvboxLight,
  'Hopscotch': hopscotch,
  'Pojoaque': pojoaque,
  'Synthwave 84': synthwave84,
  'VS': vs,
  'Xonokai': xonokai
} as const;

type ThemeName = keyof typeof themes;

// Memoized CodeDisplay to prevent re-renders during recording
const CodeDisplay = memo(({ 
  language, 
  selectedTheme, 
  displayedCode, 
  themes 
}: {
  language: string;
  selectedTheme: ThemeName;
  displayedCode: string;
  themes: typeof themes;
}) => {
  return (
    <SyntaxHighlighter
      language={language}
      style={themes[selectedTheme]}
      customStyle={{
        margin: 0,
        padding: '1rem',
        background: 'transparent',
        fontSize: '14px',
        minHeight: '100%',
      }}
      showLineNumbers
    >
      {displayedCode || ' '}
    </SyntaxHighlighter>
  );
});

const CodePlayback: React.FC<CodePlaybackProps> = ({ code, language, filename }) => {
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(30); // characters per second
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(() => {
    // Load theme from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('codePlaybackTheme');
      if (savedTheme && savedTheme in themes) {
        return savedTheme as ThemeName;
      }
    }
    return 'VS Code Dark';
  });
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const framesBuffer = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const displayedCodeRef = useRef<string>('');

  // Update ref whenever displayedCode changes
  useEffect(() => {
    displayedCodeRef.current = displayedCode;
  }, [displayedCode]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('codePlaybackTheme', selectedTheme);
    }
  }, [selectedTheme]);

  const startPlayback = useCallback(() => {
    if (currentIndex >= code.length) {
      setCurrentIndex(0);
      setDisplayedCode('');
    }
    setIsPlaying(true);
  }, [currentIndex, code.length]);

  const pausePlayback = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Enhanced syntax highlighting for common tokens
  const getTokenColor = useCallback((token: string, language: string): string => {
    const cleanToken = token.trim();
    if (!cleanToken) return '#abb2bf';
    
    // Language-specific keywords
    const jsKeywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'class', 'interface', 'type', 'async', 'await', 'try', 'catch', 'new', 'this', 'super', 'extends', 'implements'];
    const pythonKeywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'lambda', 'yield'];
    const htmlTags = ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'script', 'style', 'link'];
    
    const allKeywords = language === 'python' ? pythonKeywords : 
                       language === 'html' ? htmlTags : jsKeywords;
    
    // Keywords
    if (allKeywords.includes(cleanToken) || allKeywords.some(keyword => cleanToken.includes(keyword))) {
      return '#c678dd'; // Purple
    }
    
    // Strings (improved detection)
    if (cleanToken.match(/^(['"`]).*\1$/)) return '#98c379'; // Green
    if (cleanToken.startsWith('"') || cleanToken.startsWith("'") || cleanToken.startsWith('`')) return '#98c379';
    
    // Comments (improved detection)
    if (cleanToken.startsWith('//') || cleanToken.startsWith('/*') || cleanToken.startsWith('#')) {
      return '#5c6370'; // Gray
    }
    
    // Numbers
    if (cleanToken.match(/^\d+(\.\d+)?$/)) return '#d19a66'; // Orange
    
    // Functions/methods (improved detection)
    if (cleanToken.match(/\w+\s*\(/) || cleanToken.endsWith('()')) return '#61afef'; // Blue
    
    // HTML attributes
    if (language === 'html' && cleanToken.includes('=')) return '#e06c75'; // Red
    
    // CSS properties
    if (language === 'css' && cleanToken.includes(':')) return '#56b6c2'; // Cyan
    
    // Operators
    if (['===', '==', '!=', '!==', '<=', '>=', '<', '>', '&&', '||', '!', '+', '-', '*', '/', '%', '=', '+=', '-='].includes(cleanToken)) {
      return '#56b6c2'; // Cyan
    }
    
    // Brackets and punctuation
    if (['(', ')', '{', '}', '[', ']', ';', ',', '.'].includes(cleanToken)) {
      return '#abb2bf'; // Light gray
    }
    
    return '#abb2bf'; // Default light gray
  }, []);

  // Capture frame function - manually renders text to canvas with syntax highlighting
  const captureFrame = useCallback(() => {
    // Use ref to get current value without stale closure
    const currentDisplayedCode = displayedCodeRef.current;
    
    if (!currentDisplayedCode || isProcessingVideo) {
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Ultra-high quality settings
      const scale = 3; // Higher scaling for better quality
      const width = 1920; // Full HD width
      const height = 1080; // Full HD height
      
      // Set canvas size with scaling for quality
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(scale, scale);
      
      // Enable text smoothing
      ctx.textRenderingOptimization = 'optimizeQuality';
      ctx.imageSmoothingEnabled = true;
      
      // Fill background (VS Code Dark theme)
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, width, height);
      
      // Set text properties (larger for higher resolution)
      ctx.font = '24px "Fira Code", "JetBrains Mono", "Consolas", monospace';
      ctx.textBaseline = 'top';
      
      // Calculate scroll and visible lines (adjusted for higher resolution)
      const lines = currentDisplayedCode.split('\n');
      const lineHeight = 36;
      const padding = 30;
      const lineNumberWidth = 90;
      const maxVisibleLines = Math.floor((height - padding * 2) / lineHeight);
      
      // Simulate auto-scroll - show lines around current progress
      let startLine = 0;
      if (lines.length > maxVisibleLines) {
        // Calculate which line we're currently "typing" (based on content length)
        const currentLine = Math.min(lines.length - 1, Math.floor(lines.length * 0.8));
        startLine = Math.max(0, currentLine - Math.floor(maxVisibleLines * 0.7));
      }
      
      const endLine = Math.min(lines.length, startLine + maxVisibleLines);
      
      // Draw visible lines
      for (let i = startLine; i < endLine; i++) {
        const line = lines[i];
        const y = padding + ((i - startLine) * lineHeight);
        
        // Draw line number background
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, y - 2, lineNumberWidth, lineHeight);
        
        // Draw line number
        ctx.fillStyle = '#858585';
        ctx.fillText(`${(i + 1).toString().padStart(3, ' ')}`, padding, y);
        
        // Simple syntax highlighting
        if (line.trim()) {
          const tokens = line.split(/(\s+|[(){}\[\];,.])/);
          let xOffset = lineNumberWidth;
          
          tokens.forEach(token => {
            if (token.trim()) {
              ctx.fillStyle = getTokenColor(token, language);
              ctx.fillText(token, xOffset, y);
            } else {
              // Handle whitespace
              ctx.fillStyle = '#abb2bf';
              ctx.fillText(token, xOffset, y);
            }
            xOffset += ctx.measureText(token).width;
          });
        }
      }
      
      // Add a subtle cursor if we're at the end
      if (currentDisplayedCode.length === code.length) {
        const lastLineIndex = lines.length - 1 - startLine;
        if (lastLineIndex >= 0 && lastLineIndex < maxVisibleLines) {
          const lastLine = lines[lines.length - 1];
          const cursorX = lineNumberWidth + ctx.measureText(lastLine).width + 2;
          const cursorY = padding + (lastLineIndex * lineHeight);
          
          ctx.fillStyle = '#abb2bf';
          ctx.fillRect(cursorX, cursorY, 3, lineHeight - 6);
        }
      }
      
      const frameData = canvas.toDataURL('image/png');
      framesBuffer.current.push(frameData);
      setFrameCount(prev => prev + 1);
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }, [isProcessingVideo, language, code.length, getTokenColor]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!code) {
      alert('Please load a file first before recording');
      return;
    }
    
    setIsRecording(true);
    setFrameCount(0);
    framesBuffer.current = [];
    
    // If there's no displayed code yet, start the playback automatically
    if (!displayedCode && !isPlaying) {
      setDisplayedCode('');
      setCurrentIndex(0);
      setIsPlaying(true);
    }
    
    // Capture initial frame
    setTimeout(() => captureFrame(), 100);
    
    // Capture frames at 20 FPS for smoother video
    recordingIntervalRef.current = setInterval(() => {
      captureFrame();
    }, 50); // 50ms = 20 FPS
  }, [captureFrame, displayedCode, code, isPlaying]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  // Download video from frames
  const downloadVideo = useCallback(async () => {
    if (framesBuffer.current.length === 0) return;
    
    setIsProcessingVideo(true);
    
    try {
      // Create canvas for video generation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Load first frame to set dimensions
        const firstImg = new Image();
        await new Promise<void>((resolve) => {
          firstImg.onload = () => {
            canvas.width = firstImg.width;
            canvas.height = firstImg.height;
            resolve();
          };
          firstImg.src = framesBuffer.current[0];
        });

        // Create video stream
        const stream = canvas.captureStream(20); // 20 FPS to match capture rate
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 8000000 // 8 Mbps for high quality
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `code-playback-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setIsProcessingVideo(false);
        };

        mediaRecorder.start();

        // Play frames
        let frameIndex = 0;
        const playFrames = async () => {
          if (frameIndex < framesBuffer.current.length) {
            const img = new Image();
            await new Promise<void>((resolve) => {
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                resolve();
              };
              img.src = framesBuffer.current[frameIndex];
            });
            frameIndex++;
            setTimeout(playFrames, 50); // 20 FPS to match capture
          } else {
            setTimeout(() => mediaRecorder.stop(), 500);
          }
        };

        playFrames();
      }
    } catch (error) {
      console.error('Error creating video:', error);
      setIsProcessingVideo(false);
    }
  }, []);

  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setDisplayedCode('');
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);



  useEffect(() => {
    if (isPlaying && currentIndex < code.length) {
      const delay = 1000 / speed;
      intervalRef.current = setTimeout(() => {
        // Add multiple characters at once for faster speeds
        const charsToAdd = Math.min(Math.ceil(speed / 30), code.length - currentIndex);
        const newCode = code.slice(0, currentIndex + charsToAdd);
        setDisplayedCode(newCode);
        setCurrentIndex(currentIndex + charsToAdd);
      }, delay);
    } else if (currentIndex >= code.length && isPlaying) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, code, speed]);

  // Reset when new code is loaded
  useEffect(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setDisplayedCode('');
  }, [code]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && codeContainerRef.current) {
      const container = codeContainerRef.current;
      const codeElement = container.querySelector('pre');
      
      if (codeElement) {
        // Get all line number elements to calculate line height
        const lineNumbers = container.querySelectorAll('.linenumber');
        const lineHeight = lineNumbers.length > 1 
          ? (lineNumbers[1] as HTMLElement).offsetTop - (lineNumbers[0] as HTMLElement).offsetTop
          : 24; // fallback to approximate line height
        
        // Calculate current number of lines
        const currentLines = displayedCode.split('\n').length;
        
        // Calculate the position of the last line
        const lastLinePosition = currentLines * lineHeight;
        
        // Define margin in lines (30 lines from bottom)
        const marginInLines = 30;
        const marginInPixels = marginInLines * lineHeight;
        
        // Calculate visible area
        const visibleBottom = container.scrollTop + container.clientHeight;
        
        // Check if we need to scroll (when last line is within margin of visible bottom)
        if (lastLinePosition > visibleBottom - marginInPixels) {
          // Scroll to keep the last line with some margin from bottom
          const targetScroll = lastLinePosition - container.clientHeight + marginInPixels;
          
          container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [displayedCode, autoScroll]);

  const progress = code.length > 0 ? (currentIndex / code.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{filename}</span>
          <span className="text-xs text-gray-500">({language})</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Playback controls */}
          <button
            onClick={resetPlayback}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Reset"
          >
            <RotateCcw size={16} className="text-gray-300" />
          </button>
          
          {isPlaying ? (
            <button
              onClick={pausePlayback}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Pause"
            >
              <Pause size={16} className="text-gray-300" />
            </button>
          ) : (
            <button
              onClick={startPlayback}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Play"
            >
              <Play size={16} className="text-gray-300" />
            </button>
          )}

          {/* Speed controls */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded">
            <button
              onClick={() => setSpeed(Math.max(10, speed - 10))}
              className="p-0.5 hover:bg-gray-600 rounded transition-colors"
              title="Decrease speed"
            >
              <ZapOff size={14} className="text-gray-300" />
            </button>
            <span className="text-xs text-gray-300 min-w-[40px] text-center">{speed}x</span>
            <button
              onClick={() => setSpeed(Math.min(200, speed + 10))}
              className="p-0.5 hover:bg-gray-600 rounded transition-colors"
              title="Increase speed"
            >
              <Zap size={14} className="text-gray-300" />
            </button>
          </div>

          {/* Recording controls */}
          <div className="flex items-center gap-1">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors"
                title="Stop recording"
              >
                <Square size={16} className="text-white" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                title="Start recording code viewport"
                disabled={!code}
              >
                <Video size={16} className="text-gray-300" />
              </button>
            )}
            
            {framesBuffer.current.length > 0 && !isRecording && (
              <button
                onClick={downloadVideo}
                disabled={isProcessingVideo}
                className={`p-1.5 rounded transition-colors ${
                  isProcessingVideo 
                    ? 'bg-yellow-600 text-white cursor-not-allowed' 
                    : 'hover:bg-gray-700'
                }`}
                title={isProcessingVideo ? "Processing video..." : "Download video"}
              >
                {isProcessingVideo ? (
                  <div className="animate-spin">
                    <Settings size={16} className="text-white" />
                  </div>
                ) : (
                  <Download size={16} className="text-green-400" />
                )}
              </button>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded transition-colors ${
              autoScroll ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-gray-700'
            }`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
          >
            <ArrowDownToLine size={16} className="text-gray-300" />
          </button>

          {/* Theme selector button */}
          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Change theme"
          >
            <Palette size={16} className="text-gray-300" />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Settings"
          >
            <Settings size={16} className="text-gray-300" />
          </button>
        </div>
      </div>

      {/* Theme selector */}
      {showThemeSelector && (
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300">Theme:</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as ThemeName)}
              className="flex-1 px-2 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded text-sm"
            >
              {Object.keys(themes).map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Speed settings */}
      {showSettings && (
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Speed:</label>
              <input
                type="range"
                min="10"
                max="200"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-400 min-w-[60px]">
                {speed} char/s
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Auto-scroll:</label>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  autoScroll 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {autoScroll ? 'Enabled' : 'Disabled'}
              </button>
              <span className="text-xs text-gray-400">
                Automatically scrolls to follow the playback
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recording status */}
      {isRecording && (
        <div className="px-4 py-1 bg-red-600 text-white text-xs flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Recording Code Viewport - {frameCount} frames captured
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto" ref={codeContainerRef}>
        <CodeDisplay
          language={language}
          selectedTheme={selectedTheme}
          displayedCode={displayedCode}
          themes={themes}
        />
      </div>


      {/* Status bar */}
      <div className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>
            {currentIndex} / {code.length} characters
            {isRecording && frameCount > 0 && ` • Recording: ${frameCount} frames`}
          </span>
          <span>
            {isProcessingVideo ? (
              <span className="text-yellow-400 animate-pulse">Processing video...</span>
            ) : (
              `${Math.round(progress)}% complete`
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodePlayback;