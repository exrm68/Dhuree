export interface Episode {
  id: string;
  number: number;
  season: number;
  title: string;
  duration: string;
  telegramCode: string;          // ✅ Watch/Stream এর জন্য
  downloadCode?: string;         // ✅ Download এর জন্য (optional)
  downloadLink?: string;         // ✅ Alternative download link (optional)
}

export interface Movie {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  telegramCode: string;          // ✅ Watch/Stream এর জন্য (Required)
  downloadCode?: string;         // ✅ Download এর জন্য (optional)
  downloadLink?: string;         // ✅ Alternative download link (optional)
  rating: number;
  views: string;
  year?: string;
  quality?: string;
  description?: string;
  episodes?: Episode[];
  isPremium?: boolean;
  createdAt?: any;
  
  // Premium Features
  isFeatured?: boolean;        // Main Banner এ দেখাবে কিনা
  featuredOrder?: number;      // Banner এ কত নাম্বার পজিশনে
  isTop10?: boolean;           // Top 10 এ আছে কিনা
  top10Position?: number;      // Top 10 এ কত নাম্বার (1-10)
  storyImage?: string;         // Story Circle এ যে ছবি দেখাবে
  storyEnabled?: boolean;      // Story তে দেখাবে কিনা
  priority?: number;           // সাজানোর জন্য priority (higher = first)
  isExclusive?: boolean;       // ✅ Exclusive badge দেখাবে - category পরিবর্তন ছাড়াই
}

export interface StoryItem {
  id: string;
  image: string;              // Story circle এ যে image
  thumbnailUrl?: string;      // ভিতরে ক্লিক করলে যে বড় image
  movieId?: string;           // যদি কোনো movie এর সাথে linked থাকে
  link?: string;              // External link (optional)
  order: number;              // কত নাম্বারে দেখাবে
  createdAt?: any;
}

export interface BannerItem {
  id: string;
  movieId?: string;           // Movie এর সাথে connect
  title: string;
  image: string;              // Banner image
  description?: string;
  link?: string;              // External link (optional)
  order: number;              // Position
  isActive: boolean;
  createdAt?: any;
}

export interface AppSettings {
  botUsername: string;
  channelLink: string;
  noticeText?: string;        // Notice bar text
  noticeEnabled?: boolean;    // Notice দেখাবে কিনা
  autoViewIncrement?: boolean;
  categories?: string[];      // Custom categories যোগ করা যাবে
  
  // Premium Settings
  enableTop10?: boolean;
  enableStories?: boolean;
  enableBanners?: boolean;
  primaryColor?: string;      // Theme color
  appName?: string;          // App এর নাম
}

export type Category = 'Exclusive' | 'Korean Drama' | 'Series' | 'All' | 'Favorites' | string;
