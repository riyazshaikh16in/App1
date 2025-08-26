import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Cloud, 
  Droplets, 
  Moon, 
  Activity,
  Heart,
  Sparkles,
  Send,
  Sun,
  CloudRain,
  Newspaper,
  Calendar
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState([]);
  const [routine, setRoutine] = useState({
    sleep_hours: '',
    water_glasses: '',
    exercise_minutes: '',
    mood: ''
  });
  const [activeTab, setActiveTab] = useState('daily');

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition error. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadWeather();
    loadNews();
    loadChatHistory();
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadWeather = async () => {
    try {
      const response = await axios.get(`${API}/weather`);
      setWeather(response.data);
    } catch (error) {
      console.error('Weather loading error:', error);
    }
  };

  const loadNews = async () => {
    try {
      const response = await axios.get(`${API}/news`);
      setNews(response.data.news);
    } catch (error) {
      console.error('News loading error:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history/default_user`);
      setChatHistory(response.data);
    } catch (error) {
      console.error('Chat history loading error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage,
        user_id: 'default_user',
        location: { lat: 28.6139, lon: 77.2090 }
      });

      setChatHistory(prev => [response.data, ...prev]);
      toast.success('Got your recommendation!');
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening... Speak now!');
    }
  };

  const handleRoutineSave = async () => {
    try {
      await axios.post(`${API}/routine`, {
        user_id: 'default_user',
        date: new Date().toISOString().split('T')[0],
        ...routine
      });
      toast.success('Routine saved successfully!');
      setRoutine({ sleep_hours: '', water_glasses: '', exercise_minutes: '', mood: '' });
    } catch (error) {
      console.error('Routine save error:', error);
      toast.error('Failed to save routine.');
    }
  };

  const getWeatherIcon = (condition) => {
    if (condition?.includes('rain')) return <CloudRain className="h-5 w-5" />;
    if (condition?.includes('cloud')) return <Cloud className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
  };

  const quickSuggestions = [
    "What should I eat for breakfast?",
    "Suggest clothes for today's weather",
    "Plan my day activities",
    "Weekend entertainment ideas"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Din Charya AI
                </h1>
                <p className="text-sm text-purple-600">Your Smart Daily Assistant</p>
              </div>
            </div>

            {weather && (
              <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-full border">
                {getWeatherIcon(weather.condition)}
                <span className="text-sm font-medium text-purple-700">
                  {Math.round(weather.temperature)}°C, {weather.condition}
                </span>
                <span className="text-xs text-purple-600">{weather.location}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="daily" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              Daily Chat
            </TabsTrigger>
            <TabsTrigger value="routine" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" />
              Routine
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <News className="h-4 w-4 mr-2" />
              News
            </TabsTrigger>
          </TabsList>

          {/* Daily Chat Tab */}
          <TabsContent value="daily" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chat Interface */}
              <div className="lg:col-span-2">
                <Card className="p-6 h-[600px] flex flex-col bg-white/70 backdrop-blur-sm border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-purple-800">Chat with Din Charya AI</h2>
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      AI Assistant
                    </Badge>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                        <p className="text-purple-600 mb-4">
                          Ask me anything about your daily routine!
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {quickSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => setMessage(suggestion)}
                              className="text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg border border-purple-200 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      chatHistory.slice().reverse().map((chat, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex justify-end">
                            <div className="bg-purple-600 text-white px-4 py-2 rounded-lg max-w-xs">
                              {chat.message}
                            </div>
                          </div>
                          <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg max-w-md">
                              {chat.response}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="flex space-x-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask me anything... What should I eat? What to wear?"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 border-purple-300 focus:border-purple-500"
                    />
                    <Button
                      onClick={handleVoiceInput}
                      variant="outline"
                      size="icon"
                      className={`border-purple-300 hover:bg-purple-50 ${isListening ? 'bg-purple-100' : ''}`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isLoading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Weather & Quick Info */}
              <div className="space-y-4">
                {weather && (
                  <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Current Weather</h3>
                      {getWeatherIcon(weather.condition)}
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{Math.round(weather.temperature)}°C</p>
                      <p className="text-purple-100 capitalize">{weather.condition}</p>
                      <p className="text-sm text-purple-200">
                        Feels like {Math.round(weather.feels_like)}°C
                      </p>
                      <p className="text-sm text-purple-200">
                        Humidity: {weather.humidity}%
                      </p>
                    </div>
                  </Card>
                )}

                <Card className="p-6 bg-white/70 backdrop-blur-sm border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-purple-300 hover:bg-purple-50"
                      onClick={() => setMessage("What should I eat for lunch based on today's weather?")}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Food Suggestion
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-purple-300 hover:bg-purple-50"
                      onClick={() => setMessage("Suggest clothes for today's weather")}
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Outfit Idea
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-purple-300 hover:bg-purple-50"
                      onClick={() => setMessage("Plan productive activities for today")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Day Planning
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Routine Tracker Tab */}
          <TabsContent value="routine" className="space-y-6">
            <Card className="p-6 bg-white/70 backdrop-blur-sm border-purple-200">
              <h2 className="text-xl font-semibold text-purple-800 mb-6">Daily Routine Tracker</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 flex items-center">
                    <Moon className="h-4 w-4 mr-2" />
                    Sleep Hours
                  </label>
                  <Input
                    type="number"
                    placeholder="8.5"
                    value={routine.sleep_hours}
                    onChange={(e) => setRoutine({...routine, sleep_hours: e.target.value})}
                    className="border-purple-300 focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 flex items-center">
                    <Droplets className="h-4 w-4 mr-2" />
                    Water Glasses
                  </label>
                  <Input
                    type="number"
                    placeholder="8"
                    value={routine.water_glasses}
                    onChange={(e) => setRoutine({...routine, water_glasses: e.target.value})}
                    className="border-purple-300 focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Exercise (mins)
                  </label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={routine.exercise_minutes}
                    onChange={(e) => setRoutine({...routine, exercise_minutes: e.target.value})}
                    className="border-purple-300 focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-700 flex items-center">
                    <Heart className="h-4 w-4 mr-2" />
                    Mood Today
                  </label>
                  <select
                    value={routine.mood}
                    onChange={(e) => setRoutine({...routine, mood: e.target.value})}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select mood</option>
                    <option value="excellent">😁 Excellent</option>
                    <option value="good">😊 Good</option>
                    <option value="okay">😐 Okay</option>
                    <option value="low">😔 Low</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleRoutineSave}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Save Today's Routine
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-6">
            <Card className="p-6 bg-white/70 backdrop-blur-sm border-purple-200">
              <h2 className="text-xl font-semibold text-purple-800 mb-6">Latest Updates</h2>
              
              <div className="space-y-4">
                {news.map((item, index) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-2">{item.title}</h3>
                    <div className="flex items-center justify-between text-sm text-purple-600">
                      <span>{item.source}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;