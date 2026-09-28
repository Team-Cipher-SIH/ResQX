'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  RotateCcw,
  Trash2,
  Languages,
  MapPin,
  Phone,
  AlertTriangle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react';

// ---------- Types ----------

type MsgStatus = 'sending' | 'sent' | 'error';
type Feedback = 'up' | 'down' | null;
type Lang = 'en' | 'hi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: MsgStatus;
  feedback?: Feedback;
}

interface SuggestionItem {
  en: string;
  hi: string;
  icon: string;
}

// ---------- Static config ----------

const SUGGESTIONS: SuggestionItem[] = [
  { en: 'Where are the nearest shelters?', hi: 'सबसे नज़दीकी शेल्टर कहाँ हैं?', icon: '🏠' },
  { en: 'What should I do during a flood?', hi: 'बाढ़ के दौरान मुझे क्या करना चाहिए?', icon: '🌊' },
  { en: 'How many shelter vacancies are available?', hi: 'शेल्टर में कितनी जगह खाली है?', icon: '📊' },
  { en: "What's the safest route to a shelter?", hi: 'शेल्टर तक सबसे सुरक्षित रास्ता क्या है?', icon: '🗺️' },
  { en: 'How do I report an incident?', hi: 'घटना की रिपोर्ट कैसे करूँ?', icon: '🚨' },
  { en: 'What emergency supplies do I need?', hi: 'आपातकालीन सामान में क्या चाहिए?', icon: '📦' },
];

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    title: 'ResQTech Assistant',
    subtitle: 'Ask anything about disasters, shelters & safety',
    placeholder: 'Ask me anything...',
    howCanIHelp: 'How can I help you?',
    shareLocation: 'Share my location for nearby shelters',
    locationShared: 'Location shared',
    offline: "You're offline. Messages will be sent once you're back online.",
    clearChat: 'Clear chat',
    retry: 'Retry',
    copy: 'Copy',
    copied: 'Copied',
    timeout: 'Request timed out. Check your connection and try again.',
    genericError: 'Sorry, I encountered an error. Please try again or contact support.',
    callEmergency: 'Call 112',
    reportIncident: 'Report Incident',
    findShelters: 'Find Shelters',
    listening: 'Listening...',
    charsLeft: 'characters left',
  },
  hi: {
    title: 'ResQTech सहायक',
    subtitle: 'आपदा, शेल्टर और सुरक्षा से जुड़ा कुछ भी पूछें',
    placeholder: 'कुछ भी पूछें...',
    howCanIHelp: 'मैं आपकी कैसे मदद कर सकता हूँ?',
    shareLocation: 'नज़दीकी शेल्टर के लिए लोकेशन शेयर करें',
    locationShared: 'लोकेशन शेयर हो गई',
    offline: 'आप ऑफ़लाइन हैं। नेटवर्क आने पर मैसेज भेजा जाएगा।',
    clearChat: 'चैट साफ़ करें',
    retry: 'फिर कोशिश करें',
    copy: 'कॉपी',
    copied: 'कॉपी हो गया',
    timeout: 'रिक्वेस्ट टाइम आउट हो गई। कनेक्शन जाँचें और फिर कोशिश करें।',
    genericError: 'क्षमा करें, कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
    callEmergency: '112 पर कॉल करें',
    reportIncident: 'घटना रिपोर्ट करें',
    findShelters: 'शेल्टर खोजें',
    listening: 'सुन रहा हूँ...',
    charsLeft: 'अक्षर बचे',
  },
};

const HISTORY_KEY = 'resqx_chat_history';
const CONVO_KEY = 'resqx_conversation_id';
const LANG_KEY = 'resqx_chat_lang';
const MAX_CHARS = 500;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_STORED_MESSAGES = 50;

// Flip to false once /api/ai/chat is actually wired to the RAG backend.
// While true, the assistant answers with canned demo responses instead of
// calling the network — so the chat widget works fully for demos/prototype.
const USE_MOCK_AI = true;

const MOCK_RESPONSES: { keywords: string[]; en: string; hi: string }[] = [
  {
    keywords: ['shelter', 'camp', 'vacan', 'शेल्टर', 'कैंप'],
    en: 'Here are the nearest relief camps based on your area:\n- **Govt. Inter College Shelter** — 2.3 km, 45 spots available\n- **Community Hall, Sector 12** — 3.1 km, 20 spots available\n\nWould you like directions to the nearest one?',
    hi: 'आपके इलाके के सबसे नज़दीकी शेल्टर:\n- **गवर्नमेंट इंटर कॉलेज शेल्टर** — 2.3 किमी, 45 जगह खाली\n- **कम्युनिटी हॉल, सेक्टर 12** — 3.1 किमी, 20 जगह खाली\n\nक्या आपको सबसे नज़दीकी वाले का रास्ता चाहिए?',
  },
  {
    keywords: ['flood', 'बाढ़'],
    en: "During a flood:\n- Move to higher ground immediately\n- Avoid walking or driving through moving water\n- Keep your phone charged and stay tuned to official alerts\n- Store drinking water and dry food if evacuation isn't immediate",
    hi: 'बाढ़ के दौरान:\n- तुरंत ऊँची जगह पर चले जाएँ\n- बहते पानी में पैदल या गाड़ी से न जाएँ\n- फ़ोन चार्ज रखें और आधिकारिक अलर्ट देखते रहें\n- अगर तुरंत निकलना ज़रूरी न हो तो पीने का पानी और सूखा खाना स्टोर करें',
  },
  {
    keywords: ['route', 'safest', 'directions', 'रास्ता', 'route'],
    en: "Based on current reports, the safest route avoids the flooded low-lying areas near the river. I'd recommend heading via the main highway toward the nearest relief camp rather than local roads.",
    hi: 'मौजूदा रिपोर्ट के हिसाब से सबसे सुरक्षित रास्ता नदी के पास वाले निचले इलाकों से बचता है। लोकल सड़कों की बजाय मुख्य हाईवे से नज़दीकी शेल्टर की तरफ़ जाना बेहतर रहेगा।',
  },
  {
    keywords: ['report', 'incident', 'रिपोर्ट', 'घटना'],
    en: 'You can report an incident by tapping **Report Incident** above, or visiting the Report page. Include a photo, location, and a short description — it helps responders prioritize faster.',
    hi: 'आप ऊपर **घटना रिपोर्ट करें** पर टैप करके या रिपोर्ट पेज पर जाकर घटना रिपोर्ट कर सकते हैं। फ़ोटो, लोकेशन और छोटा विवरण शामिल करें — इससे रिस्पॉन्डर्स को जल्दी प्राथमिकता तय करने में मदद मिलती है।',
  },
  {
    keywords: ['supplies', 'kit', 'सामान', 'किट'],
    en: 'A basic emergency kit should include:\n- Drinking water (3L per person/day)\n- Non-perishable food\n- Flashlight, power bank, and a first-aid kit\n- Copies of ID documents in a waterproof bag',
    hi: 'बेसिक इमरजेंसी किट में होना चाहिए:\n- पीने का पानी (3 लीटर प्रति व्यक्ति/दिन)\n- लंबे समय तक चलने वाला खाना\n- टॉर्च, पावर बैंक और फर्स्ट-एड किट\n- ज़रूरी दस्तावेज़ों की कॉपी वॉटरप्रूफ़ बैग में',
  },
  {
    keywords: ['fire', 'आग'],
    en: 'During a fire emergency: stay low to avoid smoke, feel doors before opening them, use stairs (never elevators), and call 112 as soon as you are safe.',
    hi: 'आग लगने पर: धुएँ से बचने के लिए नीचे झुक कर चलें, दरवाज़ा खोलने से पहले उसे छूकर देखें, सीढ़ियों का इस्तेमाल करें (लिफ़्ट कभी नहीं), और सुरक्षित होते ही 112 पर कॉल करें।',
  },
  {
    keywords: ['earthquake', 'भूकंप'],
    en: 'During an earthquake: Drop, Cover, and Hold On — get under sturdy furniture, stay away from windows, and if outdoors, move to an open area away from buildings and power lines.',
    hi: 'भूकंप के दौरान: नीचे बैठें, सिर ढकें और किसी मज़बूत चीज़ को पकड़ें — मज़बूत फर्नीचर के नीचे रहें, खिड़कियों से दूर रहें, और अगर बाहर हों तो इमारतों और बिजली के तारों से दूर खुली जगह पर चले जाएँ।',
  },
];

function getMockResponse(query: string, lang: Lang): string {
  const q = query.toLowerCase();
  const match = MOCK_RESPONSES.find((entry) => entry.keywords.some((k) => q.includes(k)));
  if (match) return match[lang];

  return lang === 'hi'
    ? 'मैं अभी demo मोड में हूँ, इसलिए हर सवाल का सटीक जवाब नहीं दे सकता। शेल्टर, बाढ़, आग, भूकंप, रिपोर्टिंग या ज़रूरी सामान के बारे में पूछ कर देखें — पूरा RAG असिस्टेंट जल्द आ रहा है।'
    : "I'm running in demo mode right now, so I can't answer everything precisely yet. Try asking about shelters, floods, fire, earthquakes, reporting, or emergency supplies — the full RAG assistant is coming soon.";
}

// ---------- Helpers ----------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Minimal, safe markdown-lite renderer: **bold**, [links](url), "- " bullet lists, line breaks. */
function renderMarkdownLite(raw: string): string {
  const safe = escapeHtml(raw);
  const withBold = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withLinks = withBold.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-blue-700 hover:text-blue-900">$1</a>'
  );

  const lines = withLinks.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      if (!inList) {
        html += '<ul class="list-disc pl-4 space-y-0.5 my-1">';
        inList = true;
      }
      html += `<li>${bulletMatch[1]}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += line.length ? `${line}<br/>` : '<br/>';
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function getOrCreateConversationId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(CONVO_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CONVO_KEY, id);
  }
  return id;
}

// ---------- Component ----------

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [language, setLanguage] = useState<Lang>('en');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const conversationIdRef = useRef<string>('');

  const t = STRINGS[language];

  // ---- Init: conversation id, language pref, chat history, online status ----
  useEffect(() => {
    conversationIdRef.current = getOrCreateConversationId();

    const storedLang = localStorage.getItem(LANG_KEY) as Lang | null;
    if (storedLang === 'en' || storedLang === 'hi') setLanguage(storedLang);

    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as Message[];
        setMessages(
          parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
        );
      } catch {
        // corrupted history, ignore
      }
    }

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      recognitionRef.current?.stop?.();
    };
  }, []);

  // ---- Persist chat history (capped) ----
  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  }, [messages]);

  // ---- Persist language pref ----
  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  // ---- Auto-scroll only if user is already near the bottom ----
  useEffect(() => {
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, nearBottom]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNearBottom(distanceFromBottom < 80);
  }, []);

  // ---- Autofocus + Escape-to-close when opened ----
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [isOpen]);

  const addMessage = (
    text: string,
    sender: 'user' | 'ai',
    status: MsgStatus = 'sent'
  ): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newMessage: Message = { id, text, sender, timestamp: new Date(), status, feedback: null };
    setMessages((prev) => [...prev, newMessage]);
    return id;
  };

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const requestLocation = () => {
    setLocationRequested(true);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.log('Location access denied:', error)
      );
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = (messageText ?? inputValue).trim();
    if (!textToSend || textToSend.length > MAX_CHARS) return;

    addMessage(textToSend, 'user');
    setInputValue('');
    setIsLoading(true);
    setLastFailedQuery(null);

    const aiMessageId = addMessage('', 'ai', 'sending');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      if (USE_MOCK_AI) {
        clearTimeout(timeoutId);
        // Simulated thinking delay so the loading dots feel real in demos.
        await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 600));
        const mockText = getMockResponse(textToSend, language);
        updateMessage(aiMessageId, { text: mockText, status: 'sent' });
      } else {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('resqtech_access_token')}`,
          },
          body: JSON.stringify({
            query: textToSend,
            language,
            userLocation,
            conversationId: conversationIdRef.current,
            conversationHistory: messages.slice(-5).map(({ text, sender }) => ({ text, sender })),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
          console.error('API Error:', data);
          throw new Error(data.message || 'Failed to get AI response');
        }

        updateMessage(aiMessageId, { text: data.response, status: 'sent' });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      const errorText = aborted
        ? t.timeout
        : error instanceof Error
        ? error.message
        : t.genericError;
      console.error('Error:', error);
      updateMessage(aiMessageId, { text: errorText, status: 'error' });
      setLastFailedQuery(textToSend);
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = () => {
    if (!lastFailedQuery) return;
    // remove the last (errored) ai message before retrying
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.sender === 'ai' && m.status === 'error');
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
    handleSendMessage(lastFailedQuery);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
    setLastFailedQuery(null);
  };

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const sendFeedback = async (id: string, feedback: 'up' | 'down') => {
    const message = messages.find((m) => m.id === id);
    updateMessage(id, { feedback });
    try {
      await fetch('/api/ai/chat/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('resqtech_access_token')}`,
        },
        body: JSON.stringify({
          conversationId: conversationIdRef.current,
          messageId: id,
          feedback,
          response: message?.text,
        }),
      });
    } catch (err) {
      // Non-blocking: feedback endpoint may not exist yet server-side.
      console.log('Feedback endpoint unavailable:', err);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInputValue(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const charsLeft = MAX_CHARS - inputValue.length;

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:shadow-xl"
        aria-label="Open AI Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t.title}
          className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40 w-[calc(100vw-32px)] md:w-96 bg-white rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-bold text-lg">{t.title}</h2>
                <p className="text-sm text-blue-100">{t.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
                  className="p-1.5 rounded hover:bg-white/20 transition-colors"
                  title={language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
                  aria-label="Toggle language"
                >
                  <Languages size={16} />
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded hover:bg-white/20 transition-colors"
                    title={t.clearChat}
                    aria-label={t.clearChat}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Emergency quick actions */}
          <div className="flex border-b bg-red-50 text-xs">
            <a
              href="tel:112"
              className="flex-1 flex items-center justify-center gap-1 py-2 text-red-700 font-semibold hover:bg-red-100 transition-colors"
            >
              <Phone size={13} /> {t.callEmergency}
            </a>
            <a
              href="/citizen/dashboard"
              className="flex-1 flex items-center justify-center gap-1 py-2 border-l border-red-200 text-red-700 font-semibold hover:bg-red-100 transition-colors"
            >
              <AlertTriangle size={13} /> {t.reportIncident}
            </a>
            <a
              href="/authority/shelters"
              className="flex-1 flex items-center justify-center gap-1 py-2 border-l border-red-200 text-red-700 font-semibold hover:bg-red-100 transition-colors"
            >
              <MapPin size={13} /> {t.findShelters}
            </a>
          </div>

          {/* Offline banner */}
          {!isOnline && (
            <div className="flex items-center gap-2 bg-amber-100 text-amber-800 text-xs px-3 py-2 border-b border-amber-200">
              <WifiOff size={14} />
              <span>{t.offline}</span>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <MessageCircle size={48} className="mb-2 text-blue-400" />
                <p className="text-sm font-semibold mb-3">{t.howCanIHelp}</p>

                {!locationRequested && (
                  <button
                    onClick={requestLocation}
                    className="mb-3 w-full mx-2 flex items-center justify-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 hover:bg-blue-100 transition-colors"
                  >
                    <MapPin size={14} /> {t.shareLocation}
                  </button>
                )}
                {userLocation && (
                  <p className="mb-3 text-xs text-green-700 flex items-center gap-1">
                    <Check size={12} /> {t.locationShared}
                  </p>
                )}

                <div className="space-y-2 w-full px-2">
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion[language])}
                      className="w-full text-left p-3 bg-white hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 text-sm transition-all"
                    >
                      <span className="mr-2">{suggestion.icon}</span>
                      {suggestion[language]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[85%] flex flex-col">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.status === 'error'
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {message.status === 'sending' ? (
                          <div className="flex space-x-2 py-1">
                            <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            />
                          </div>
                        ) : message.sender === 'ai' ? (
                          <p
                            className="text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMarkdownLite(message.text) }}
                          />
                        ) : (
                          <p className="text-sm">{message.text}</p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* AI message actions: copy, feedback, retry */}
                      {message.sender === 'ai' && message.status === 'sent' && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          <button
                            onClick={() => copyMessage(message.id, message.text)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title={t.copy}
                            aria-label={t.copy}
                          >
                            {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => sendFeedback(message.id, 'up')}
                            className={`transition-colors ${
                              message.feedback === 'up' ? 'text-green-600' : 'text-gray-400 hover:text-green-600'
                            }`}
                            aria-label="Helpful"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            onClick={() => sendFeedback(message.id, 'down')}
                            className={`transition-colors ${
                              message.feedback === 'down' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'
                            }`}
                            aria-label="Not helpful"
                          >
                            <ThumbsDown size={13} />
                          </button>
                        </div>
                      )}
                      {message.sender === 'ai' && message.status === 'error' && (
                        <button
                          onClick={retryLastMessage}
                          className="flex items-center gap-1 mt-1 ml-1 text-xs text-red-700 hover:text-red-900 font-medium"
                        >
                          <RotateCcw size={12} /> {t.retry}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 bg-white rounded-b-lg">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? t.listening : t.placeholder}
                disabled={isLoading}
                maxLength={MAX_CHARS}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {speechSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`rounded p-2 transition-colors ${
                    isListening
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                  aria-label="Voice input"
                  title="Voice input"
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded px-4 py-2 transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                {isOnline ? <Wifi size={11} /> : <WifiOff size={11} className="text-amber-600" />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {inputValue.length > MAX_CHARS * 0.8 && (
                <span
                  className={`text-[10px] ${charsLeft < 20 ? 'text-red-500' : 'text-gray-400'}`}
                >
                  {charsLeft} {t.charsLeft}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
