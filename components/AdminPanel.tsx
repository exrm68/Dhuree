import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, LogOut, Trash2, Edit, Plus, Save, 
  Film, Award, Layout, Image as ImageIcon, Settings as SettingsIcon,
  Star, List, TrendingUp, Bell
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, 
  query, orderBy, setDoc, getDoc, writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Movie, Episode, AppSettings, StoryItem, BannerItem } from '../types';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [user, setUser] = useState<User | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Lists
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);

  // Upload Form
  const [contentType, setContentType] = useState<'movie' | 'series'>('movie');
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [category, setCategory] = useState('Exclusive');
  const [year, setYear] = useState('2024');
  const [rating, setRating] = useState('9.0');
  const [description, setDescription] = useState('');
  const [movieCode, setMovieCode] = useState('');
  const [movieDownloadCode, setMovieDownloadCode] = useState(''); // ✅ NEW: আলাদা Download Code
  const [isExclusive, setIsExclusive] = useState(false); // ✅ NEW: Exclusive badge
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  
  // Episode Form
  const [epTitle, setEpTitle] = useState('');
  const [epSeason, setEpSeason] = useState('1');
  const [epNumber, setEpNumber] = useState('1');
  const [epCode, setEpCode] = useState('');
  const [epDownloadCode, setEpDownloadCode] = useState(''); // ✅ NEW: Episode Download Code

  // Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Settings
  const [botUsername, setBotUsername] = useState('');
  const [channelLink, setChannelLink] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Exclusive', 'Korean Drama', 'Series']);

  // Top 10 State
  const [top10Movies, setTop10Movies] = useState<Movie[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ========== FETCH DATA ==========
  const fetchMovies = async () => {
    try {
      const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movie[];
      setMovieList(list);
      
      // Filter Top 10
      const top10 = list.filter(m => m.isTop10).sort((a, b) => 
        (a.top10Position || 10) - (b.top10Position || 10)
      );
      setTop10Movies(top10);
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const fetchBanners = async () => {
    try {
      const q = query(collection(db, "banners"), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BannerItem[]);
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const fetchStories = async () => {
    try {
      const q = query(collection(db, "stories"), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StoryItem[]);
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBotUsername(data.botUsername || '');
        setChannelLink(data.channelLink || '');
        setNoticeText(data.noticeText || '');
        setNoticeEnabled(data.noticeEnabled !== false);
        setCategories(data.categories || ['Exclusive', 'Korean Drama', 'Series']);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMovies();
      if (activeTab === 'banners') fetchBanners();
      if (activeTab === 'stories') fetchStories();
      if (activeTab === 'settings') fetchSettings();
    }
  }, [user, activeTab]);

  // ========== LOGIN ==========
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showSuccess('✅ Login Successful!');
    } catch (err: any) {
      alert('❌ Invalid credentials');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  // ========== CONTENT MANAGEMENT ==========
  const addEpisode = () => {
    if (!epTitle || !epCode) {
      alert('⚠️ Episode Title and Watch Code required!');
      return;
    }

    const newEp: Episode = {
      id: `ep_${Date.now()}`,
      season: parseInt(epSeason) || 1,
      number: parseInt(epNumber) || 1,
      title: epTitle,
      duration: '45m',
      telegramCode: epCode,
      ...(epDownloadCode ? { downloadCode: epDownloadCode } : {}) // ✅ আলাদা download code
    };

    setEpisodes([...episodes, newEp]);
    setEpTitle('');
    setEpNumber(String(parseInt(epNumber) + 1));
    setEpCode('');
    setEpDownloadCode('');
    showSuccess(`✅ Episode ${newEp.number} added!`);
  };

  const handlePublish = async () => {
    if (!title || !thumbnail) {
      alert('⚠️ Title and Thumbnail required!');
      return;
    }

    if (contentType === 'movie' && !movieCode) {
      alert('⚠️ Movie Code required!');
      return;
    }

    if (contentType === 'series' && episodes.length === 0) {
      alert('⚠️ Add at least one episode!');
      return;
    }

    setLoading(true);
    try {
      const movieData: any = {
        title,
        thumbnail,
        category,
        rating: parseFloat(rating) || 9.0,
        views: '1.2M',
        year,
        description,
        isExclusive: isExclusive, // ✅ Exclusive badge flag
        createdAt: serverTimestamp()
      };

      if (contentType === 'movie') {
        movieData.telegramCode = movieCode;
        if (movieDownloadCode) movieData.downloadCode = movieDownloadCode; // ✅ আলাদা download code
      } else {
        movieData.episodes = episodes.sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.number - b.number;
        });
      }

      if (isEditing && editId) {
        await updateDoc(doc(db, 'movies', editId), movieData);
        showSuccess('✅ Updated!');
      } else {
        await addDoc(collection(db, 'movies'), movieData);
        showSuccess('✅ Published!');
      }

      resetForm();
      fetchMovies();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleEdit = (movie: Movie) => {
    setTitle(movie.title);
    setThumbnail(movie.thumbnail);
    setCategory(movie.category);
    setYear(movie.year || '2024');
    setRating(movie.rating?.toString() || '9.0');
    setDescription(movie.description || '');

    if (movie.episodes && movie.episodes.length > 0) {
      setContentType('series');
      setEpisodes(movie.episodes);
      setMovieCode('');
      setMovieDownloadCode('');
    } else {
      setContentType('movie');
      setMovieCode(movie.telegramCode || '');
      setMovieDownloadCode(movie.downloadCode || ''); // ✅ load existing download code
      setEpisodes([]);
    }
    setIsExclusive(movie.isExclusive || false); // ✅ load exclusive flag

    setIsEditing(true);
    setEditId(movie.id);
    setActiveTab('upload');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this content?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'movies', id));
      showSuccess('✅ Deleted!');
      fetchMovies();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setThumbnail('');
    setCategory('Exclusive');
    setYear('2024');
    setRating('9.0');
    setDescription('');
    setMovieCode('');
    setMovieDownloadCode('');
    setIsExclusive(false); // ✅ reset
    setEpisodes([]);
    setContentType('movie');
    setIsEditing(false);
    setEditId(null);
  };

  // ========== TOP 10 MANAGEMENT ==========
  const toggleTop10 = async (movieId: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        // Add to Top 10
        const nextPosition = top10Movies.length + 1;
        if (nextPosition > 10) {
          alert('⚠️ Top 10 is full! Remove one first.');
          return;
        }
        await updateDoc(doc(db, 'movies', movieId), {
          isTop10: true,
          top10Position: nextPosition
        });
        showSuccess('✅ Added to Top 10!');
      } else {
        // Remove from Top 10
        await updateDoc(doc(db, 'movies', movieId), {
          isTop10: false,
          top10Position: null
        });
        showSuccess('✅ Removed from Top 10!');
      }
      fetchMovies();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  const updateTop10Position = async (movieId: string, newPosition: number) => {
    if (newPosition < 1 || newPosition > 10) {
      alert('⚠️ Position must be 1-10!');
      return;
    }

    try {
      await updateDoc(doc(db, 'movies', movieId), {
        top10Position: newPosition
      });
      showSuccess('✅ Position updated!');
      fetchMovies();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ========== BANNER MANAGEMENT ==========
  const handleAddBanner = async (movieId: string) => {
    const movie = movieList.find(m => m.id === movieId);
    if (!movie) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'banners'), {
        title: movie.title,
        image: movie.thumbnail,
        movieId: movie.id,
        order: banners.length + 1,
        isActive: true,
        createdAt: serverTimestamp()
      });
      showSuccess('✅ Banner added!');
      fetchBanners();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      showSuccess('✅ Deleted!');
      fetchBanners();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ========== STORY MANAGEMENT ==========
  const handleAddStory = async (movieId: string) => {
    const movie = movieList.find(m => m.id === movieId);
    if (!movie) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'stories'), {
        image: movie.thumbnail,
        movieId: movie.id,
        order: stories.length + 1,
        createdAt: serverTimestamp()
      });
      showSuccess('✅ Story added!');
      fetchStories();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Delete story?')) return;
    try {
      await deleteDoc(doc(db, 'stories', id));
      showSuccess('✅ Deleted!');
      fetchStories();
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  // ========== SETTINGS ==========
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'config'), {
        botUsername,
        channelLink,
        noticeText,
        noticeEnabled,
        categories
      });
      showSuccess('✅ Settings saved!');
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    }
    setLoading(false);
  };

  // ========== LOGIN UI ==========
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">🔐 Admin Login</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ========== MAIN ADMIN UI ==========
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">🎬 CINEFLIX Admin</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="text-gray-400 hover:text-white flex items-center gap-2">
              <LogOut size={18} />
              Logout
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-2 overflow-x-auto">
        {[
          { id: 'upload', icon: Upload, label: 'Upload' },
          { id: 'content', icon: Film, label: 'Content' },
          { id: 'top10', icon: Award, label: 'Top 10' },
          { id: 'banners', icon: Layout, label: 'Banners' },
          { id: 'stories', icon: ImageIcon, label: 'Stories' },
          { id: 'settings', icon: SettingsIcon, label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                {isEditing ? '✏️ Edit Content' : '➕ Upload New Content'}
              </h2>

              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setContentType('movie'); setEpisodes([]); }}
                  className={`p-6 rounded-xl border-2 transition ${
                    contentType === 'movie'
                      ? 'border-red-600 bg-red-600/10'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <Film className="mx-auto mb-2" size={32} />
                  <div className="font-bold text-white">Single Movie</div>
                </button>
                <button
                  onClick={() => { setContentType('series'); setMovieCode(''); }}
                  className={`p-6 rounded-xl border-2 transition ${
                    contentType === 'series'
                      ? 'border-blue-600 bg-blue-600/10'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <List className="mx-auto mb-2" size={32} />
                  <div className="font-bold text-white">Series</div>
                </button>
              </div>

              {/* Form */}
              <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title *"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="Thumbnail URL *"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                {thumbnail && (
                  <img src={thumbnail} alt="Preview" className="h-32 rounded-lg object-cover" />
                )}

                <div className="grid grid-cols-3 gap-4">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Year"
                    className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="Rating"
                    className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                {/* ✅ Exclusive Badge Toggle */}
                <div
                  onClick={() => setIsExclusive(!isExclusive)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isExclusive
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm">⭐ EXCLUSIVE Badge</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      চালু করলে thumbnail এ EXCL badge দেখাবে। Category পরিবর্তন হবে না।
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all ${isExclusive ? 'bg-yellow-500' : 'bg-gray-700'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isExclusive ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />

                {contentType === 'movie' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={movieCode}
                      onChange={(e) => setMovieCode(e.target.value)}
                      placeholder="🎬 Watch/Stream Code (Telegram Video ID) *"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={movieDownloadCode}
                        onChange={(e) => setMovieDownloadCode(e.target.value)}
                        placeholder="⬇️ Download Code (আলাদা রাখতে চাইলে দিন, না দিলে Watch Code ব্যবহার হবে)"
                        className="w-full px-4 py-3 bg-gray-900 border border-green-700/50 rounded-lg text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-500 font-bold">Optional</span>
                    </div>
                    <p className="text-xs text-gray-500 px-1">
                      💡 Watch Code = Bot এ stream হবে। Download Code = আলাদা file/bot থেকে download হবে।
                    </p>
                  </div>
                )}

                {contentType === 'series' && (
                  <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                    <div className="font-bold text-white mb-2">Add Episodes</div>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        value={epSeason}
                        onChange={(e) => setEpSeason(e.target.value)}
                        placeholder="Season"
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                      <input
                        type="number"
                        value={epNumber}
                        onChange={(e) => setEpNumber(e.target.value)}
                        placeholder="Ep #"
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                      <input
                        type="text"
                        value={epTitle}
                        onChange={(e) => setEpTitle(e.target.value)}
                        placeholder="Title"
                        className="col-span-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={epCode}
                      onChange={(e) => setEpCode(e.target.value)}
                      placeholder="🎬 Watch Code (Telegram Video ID) *"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                    <input
                      type="text"
                      value={epDownloadCode}
                      onChange={(e) => setEpDownloadCode(e.target.value)}
                      placeholder="⬇️ Download Code (আলাদা থাকলে দিন - Optional)"
                      className="w-full px-3 py-2 bg-gray-800 border border-green-700/40 rounded text-white text-sm"
                    />
                    <button
                      onClick={addEpisode}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                    >
                      <Plus size={18} className="inline mr-2" />
                      Add Episode
                    </button>

                    {episodes.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="text-sm text-gray-400">Episodes ({episodes.length})</div>
                        {episodes.map(ep => (
                          <div key={ep.id} className="bg-gray-800 rounded p-2 flex items-center justify-between text-sm">
                            <div>
                              <span className="text-white">S{ep.season}E{ep.number}: {ep.title}</span>
                              {ep.downloadCode && (
                                <span className="ml-2 text-xs text-green-400">⬇ DL</span>
                              )}
                            </div>
                            <button
                              onClick={() => setEpisodes(episodes.filter(e => e.id !== ep.id))}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Save size={20} className="inline mr-2" />
                  {loading ? 'Processing...' : isEditing ? 'Update' : 'Publish'}
                </button>
              </div>
            </div>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">📚 All Content ({movieList.length})</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {movieList.map(movie => (
                  <div key={movie.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex gap-4">
                      <img 
                        src={movie.thumbnail} 
                        alt={movie.title}
                        className="w-24 h-36 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold mb-2">{movie.title}</h3>
                        <div className="flex flex-wrap gap-2 text-xs mb-3">
                          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">{movie.category}</span>
                          <span className="px-2 py-1 bg-yellow-600 rounded text-white">⭐ {movie.rating}</span>
                          {movie.episodes && <span className="px-2 py-1 bg-blue-600 rounded text-white">{movie.episodes.length} Eps</span>}
                          {movie.isTop10 && <span className="px-2 py-1 bg-red-600 rounded text-white">Top 10</span>}
                          {movie.downloadCode && <span className="px-2 py-1 bg-green-700 rounded text-white text-[10px]">⬇ DL Code</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(movie)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                          >
                            <Edit size={14} className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(movie.id)}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                          >
                            <Trash2 size={14} className="inline mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP 10 TAB */}
          {activeTab === 'top10' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">🏆 Top 10 Management</h2>

              {/* Current Top 10 */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Current Top 10 ({top10Movies.length}/10)</h3>
                <div className="space-y-3">
                  {top10Movies.map(movie => (
                    <div key={movie.id} className="bg-gradient-to-r from-yellow-900/30 to-gray-800 rounded-lg p-4 border border-yellow-700/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          #{movie.top10Position}
                        </div>
                        <img src={movie.thumbnail} alt={movie.title} className="w-16 h-24 object-cover rounded" />
                        <div className="flex-1">
                          <h4 className="text-white font-bold">{movie.title}</h4>
                          <p className="text-gray-400 text-sm">{movie.category} • {movie.year}</p>
                          <div className="flex gap-2 mt-2">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              defaultValue={movie.top10Position}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) updateTop10Position(movie.id, val);
                              }}
                              className="w-20 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                            />
                            <button
                              onClick={() => toggleTop10(movie.id, true)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add to Top 10 */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Add to Top 10</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movieList.filter(m => !m.isTop10).map(movie => (
                    <div key={movie.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                      <img src={movie.thumbnail} alt={movie.title} className="w-16 h-24 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm truncate">{movie.title}</h4>
                        <p className="text-gray-400 text-xs">{movie.category}</p>
                      </div>
                      <button
                        onClick={() => toggleTop10(movie.id, false)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BANNERS TAB */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">🖼️ Banner Management</h2>

              <div>
                <h3 className="text-lg font-bold text-white mb-4">Current Banners ({banners.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {banners.map(banner => (
                    <div key={banner.id} className="bg-gray-800 rounded-lg overflow-hidden">
                      <img src={banner.image} alt={banner.title} className="w-full h-40 object-cover" />
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-bold">{banner.title}</h4>
                          <p className="text-gray-400 text-sm">Order: #{banner.order}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 rounded text-white"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-4">Add Banner (Select from your content)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {movieList.map(movie => (
                    <div key={movie.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                      <img src={movie.thumbnail} alt={movie.title} className="w-20 h-28 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{movie.title}</h4>
                        <p className="text-gray-400 text-sm">{movie.category}</p>
                      </div>
                      <button
                        onClick={() => handleAddBanner(movie.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STORIES TAB */}
          {activeTab === 'stories' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">📸 Instagram Stories</h2>

              <div>
                <h3 className="text-lg font-bold text-white mb-4">Current Stories ({stories.length})</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {stories.map(story => (
                    <div key={story.id} className="flex-shrink-0 text-center relative">
                      <img 
                        src={story.image} 
                        alt="Story" 
                        className="w-20 h-20 rounded-full object-cover border-4 border-pink-500"
                      />
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-4">Add Story (Select from your content)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {movieList.map(movie => (
                    <div key={movie.id} className="bg-gray-800 rounded-lg p-3 text-center">
                      <img src={movie.thumbnail} alt={movie.title} className="w-full h-40 object-cover rounded mb-2" />
                      <h4 className="text-white text-sm font-medium truncate mb-2">{movie.title}</h4>
                      <button
                        onClick={() => handleAddStory(movie.id)}
                        disabled={loading}
                        className="w-full px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded text-white text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">⚙️ App Settings</h2>
              
              <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">🤖 Bot Username</label>
                  <p className="text-xs text-gray-500 mb-2">Watch/Download এ যে bot ব্যবহার হবে (@ ছাড়া)</p>
                  <input
                    type="text"
                    value={botUsername}
                    onChange={(e) => setBotUsername(e.target.value)}
                    placeholder="YourBot"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">📢 Telegram Channel Link</label>
                  <p className="text-xs text-gray-500 mb-2">Header এর Send আইকন এবং Notice এর REQ বাটনে এই link যাবে</p>
                  <input
                    type="text"
                    value={channelLink}
                    onChange={(e) => setChannelLink(e.target.value)}
                    placeholder="https://t.me/yourchannel"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">📣 Notice Text (Marquee)</label>
                  <p className="text-xs text-gray-500 mb-2">হোম পেজে scroll হওয়া notice বার এ যে লেখা দেখাবে</p>
                  <input
                    type="text"
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    placeholder="যেকোনো ঘোষণা লিখুন..."
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
                  <input
                    type="checkbox"
                    checked={noticeEnabled}
                    onChange={(e) => setNoticeEnabled(e.target.checked)}
                    className="w-5 h-5 accent-yellow-500"
                  />
                  <div>
                    <label className="text-white font-medium">Notice Bar দেখানো হবে</label>
                    <p className="text-xs text-gray-500">বন্ধ করলে notice bar হোম পেজে দেখাবে না</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
                >
                  <Save size={18} className="inline mr-2" />
                  Save Settings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
