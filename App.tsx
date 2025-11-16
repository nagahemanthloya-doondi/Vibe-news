import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getNews, getArticleDetails, getNewsFromUrls } from './services/geminiService';
import type { NewsArticle, GroundingChunk, SavedVibe } from './types';
import { NewsCard } from './components/NewsCard';
import { Loader } from './components/Loader';
import { SearchIcon } from './components/icons/SearchIcon';
import { LocationIcon } from './components/icons/LocationIcon';
import { MenuIcon } from './components/icons/MenuIcon';
import { CloseIcon } from './components/icons/CloseIcon';
import { RssIcon } from './components/icons/RssIcon';
import { TopicsPanel } from './components/TopicsPanel';
import { ArticleDetail } from './components/ArticleDetail';
import { snapSound } from './assets/sounds';

const SAVED_VIBES_KEY = 'vibeNewsSavedVibes';

export default function App() {
    const [topic, setTopic] = useState<string>("Global Technology Trends");
    const [location, setLocation] = useState<string>("San Francisco, CA");
    const [rssUrl, setRssUrl] = useState('');
    const [opmlFile, setOpmlFile] = useState<File | null>(null);
    const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);
    const [isRssExpanded, setIsRssExpanded] = useState(false);
    const [savedVibes, setSavedVibes] = useState<SavedVibe[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

    const snapAudioRef = useRef<HTMLAudioElement>(null);
    
    useEffect(() => {
        try {
            const storedVibes = localStorage.getItem(SAVED_VIBES_KEY);
            if (storedVibes) {
                setSavedVibes(JSON.parse(storedVibes));
            }
        } catch (error) {
            console.error("Failed to load vibes from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SAVED_VIBES_KEY, JSON.stringify(savedVibes));
        } catch (error) {
            console.error("Failed to save vibes to localStorage", error);
        }
    }, [savedVibes]);


    const playSnapSound = useCallback(() => {
        if (snapAudioRef.current) {
            snapAudioRef.current.currentTime = 0;
            snapAudioRef.current.play().catch(e => console.error("Error playing snap sound:", e));
        }
    }, []);

    const hasNews = newsArticles.length > 0;
    const isCustomSource = rssUrl.trim() !== '' || opmlFile !== null;

    const handleFetchNews = useCallback(async (params: { topic?: string; location?: string; rssUrl?: string; opmlUrls?: string[] }) => {
        if (!params.topic && !params.rssUrl && !params.opmlUrls) {
            setError("Please enter a topic or provide a custom source.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setNewsArticles([]);
        setSources([]);

        try {
            let result;
            if (params.opmlUrls) {
                result = await getNewsFromUrls(params.opmlUrls);
            } else if (params.rssUrl) {
                result = await getNewsFromUrls([params.rssUrl]);
            } else if (params.topic && params.location) {
                result = await getNews(params.topic, params.location);
            } else {
                throw new Error("Invalid search parameters.");
            }
            
            if (result.articles.length === 0) {
                 setError("No news found for this source. Try something else!");
                 setIsFormCollapsed(false);
            } else {
                setNewsArticles(result.articles);
                setSources(result.sources);
                setCurrentCardIndex(0);
                setIsFormCollapsed(true);
            }
        } catch (err: any) {
            setError(err.message);
            setIsFormCollapsed(false);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSaveVibe = useCallback(() => {
        if (rssUrl.trim()) {
            const trimmedRssUrl = rssUrl.trim();
            const isAlreadySaved = savedVibes.some(vibe => vibe.rssUrl === trimmedRssUrl);
            if (isAlreadySaved) {
                alert("This RSS feed is already saved.");
                return;
            }
            try {
                const url = new URL(trimmedRssUrl);
                const newVibe: SavedVibe = {
                    topic: url.hostname,
                    location: 'Custom Feed',
                    rssUrl: trimmedRssUrl
                };
                setSavedVibes(prev => [newVibe, ...prev]);
            } catch (_) {
                alert("Please enter a valid RSS feed URL to save.");
            }
        } else if (topic.trim() && location.trim()) {
            const trimmedTopic = topic.trim();
            const trimmedLocation = location.trim();
    
            const isAlreadySaved = savedVibes.some(
                vibe => !vibe.rssUrl &&
                        vibe.topic.toLowerCase() === trimmedTopic.toLowerCase() &&
                        vibe.location.toLowerCase() === trimmedLocation.toLowerCase()
            );
            if (!isAlreadySaved) {
                setSavedVibes(prev => [{ topic: trimmedTopic, location: trimmedLocation }, ...prev]);
            } else {
                alert("This Vibe (topic & location) is already saved.");
            }
        }
    }, [topic, location, rssUrl, savedVibes]);


    const handleNext = () => {
        setCurrentCardIndex((prevIndex) => (prevIndex + 1) % newsArticles.length);
    };

    const handlePrev = () => {
        setCurrentCardIndex((prevIndex) => (prevIndex - 1 + newsArticles.length) % newsArticles.length);
    };

    const handleCardClick = useCallback(async (articleIndex: number) => {
        const article = newsArticles[articleIndex];
        setSelectedArticle(article);

        if (!article.fullContent) {
            try {
                const fullContent = await getArticleDetails(article);
                const updatedArticles = [...newsArticles];
                const updatedArticle = { ...article, fullContent };
                updatedArticles[articleIndex] = updatedArticle;
                setNewsArticles(updatedArticles);
                setSelectedArticle(updatedArticle);
            } catch (e: any) {
                console.error("Failed to fetch article details", e);
                const updatedArticles = [...newsArticles];
                updatedArticles[articleIndex] = { ...article, fullContent: `Error: ${e.message}` };
                setNewsArticles(updatedArticles);
                setSelectedArticle(updatedArticles[articleIndex]);
            }
        }
    }, [newsArticles]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (opmlFile) {
            const fileContent = await opmlFile.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(fileContent, "application/xml");
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                setError("Failed to parse OPML file. Please check the file format.");
                return;
            }
            const outlines = xmlDoc.querySelectorAll('outline[xmlUrl]');
            if (outlines.length === 0) {
                setError("No valid RSS feed URLs found in the OPML file.");
                return;
            }
            const urls = Array.from(outlines).map(node => node.getAttribute('xmlUrl')).filter(Boolean) as string[];
            setTopic(`From ${opmlFile.name}`);
            setLocation("Custom Feed"); 
            handleFetchNews({ opmlUrls: urls });
        } else if (rssUrl.trim()) {
            try {
                const url = new URL(rssUrl.trim());
                setTopic(url.hostname);
                setLocation("Custom Feed");
                handleFetchNews({ rssUrl: url.href });
            } catch (_) {
                setError("Please enter a valid RSS feed URL.");
            }
        } else {
            handleFetchNews({ topic, location });
        }
    };

    const handleSelectVibe = (selectedVibe: SavedVibe) => {
        setIsPanelOpen(false);
        if (selectedVibe.rssUrl) {
            setTopic(selectedVibe.topic);
            setLocation(selectedVibe.location);
            setRssUrl(selectedVibe.rssUrl);
            setOpmlFile(null);
            setTimeout(() => {
                handleFetchNews({ rssUrl: selectedVibe.rssUrl });
            }, 300);
        } else {
            setTopic(selectedVibe.topic);
            setLocation(selectedVibe.location);
            setRssUrl('');
            setOpmlFile(null);
            setTimeout(() => {
                handleFetchNews({ topic: selectedVibe.topic, location: selectedVibe.location });
            }, 300);
        }
    };
    
    const handleDeleteVibe = (vibeToDelete: SavedVibe) => {
        setSavedVibes(prev => prev.filter(vibe => {
            if (vibeToDelete.rssUrl) {
                return vibe.rssUrl !== vibeToDelete.rssUrl;
            }
            if (vibe.rssUrl) {
                return true;
            }
            return vibe.topic.toLowerCase() !== vibeToDelete.topic.toLowerCase() ||
                   vibe.location.toLowerCase() !== vibeToDelete.location.toLowerCase();
        }));
    };

    const handleRssUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRssUrl(e.target.value);
        if (e.target.value) {
            setOpmlFile(null);
        }
    };
    
    const handleOpmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setOpmlFile(file);
        if (file) {
            setRssUrl('');
        }
        e.target.value = ''; // Allow re-uploading the same file
    };


    const renderContent = () => {
        if (isLoading) {
            return <Loader />;
        }
        if (error) {
            return <div className="text-center bg-red-100 border-2 border-black p-4 rounded-lg shadow-hard-sm">
                <p className="font-bold text-red-700">An Error Occurred</p>
                <p className="text-red-600 mt-1">{error}</p>
            </div>;
        }
        if (hasNews) {
            return (
                <>
                    <NewsCard 
                        key={currentCardIndex}
                        article={newsArticles[currentCardIndex]} 
                        sources={sources}
                        cardIndex={currentCardIndex}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onSwipeAway={() => {}}
                        onSnapBack={playSnapSound}
                        onClick={() => handleCardClick(currentCardIndex)}
                    />
                     <div className="flex justify-center items-center gap-4 mt-6">
                        <button 
                            onClick={handlePrev} 
                            className="bg-lime-300 text-black font-bold py-2 px-6 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            Prev
                        </button>
                        <span className="font-mono">{currentCardIndex + 1} / {newsArticles.length}</span>
                        <button 
                            onClick={handleNext} 
                            className="bg-pink-300 text-black font-bold py-2 px-6 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            Next
                        </button>
                    </div>
                </>
            );
        }
        return (
            <div className="text-center text-gray-500 border-2 border-dashed border-gray-400 p-12 rounded-lg">
                <h2 className="font-display text-xl mb-2">Welcome to Vibe News!</h2>
                <p>Enter a topic above to get started.</p>
            </div>
        );
    };

    return (
        <>
            <TopicsPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                vibes={savedVibes}
                onSelectVibe={handleSelectVibe}
                onDeleteVibe={handleDeleteVibe}
            />
            {selectedArticle && (
                <ArticleDetail
                    article={selectedArticle}
                    sources={sources}
                    onClose={() => setSelectedArticle(null)}
                />
            )}
            <audio ref={snapAudioRef} src={snapSound} preload="auto" />
            <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#F4F4F4] selection:bg-yellow-300 selection:text-black">
                <div className={`transition-all duration-500 ease-in-out z-40 ${hasNews ? 'fixed top-4 left-4' : 'relative w-full max-w-2xl'}`}>
                    {!hasNews && (
                        <header className="w-full max-w-2xl mb-8 text-center">
                            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-wider">
                                Vibe News Cards
                            </h1>
                            <p className="mt-2 text-gray-600">Your daily news dose, reimagined.</p>
                        </header>
                    )}
                    
                    {hasNews && isFormCollapsed && (
                         <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsPanelOpen(true)}
                                className="bg-cyan-300 p-3 border-2 border-black rounded-lg shadow-hard-sm hover:shadow-hard-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                                aria-label="Open saved vibes"
                            >
                                <MenuIcon className="w-6 h-6 text-black"/>
                            </button>
                            <button 
                                onClick={() => setIsFormCollapsed(false)}
                                className="bg-yellow-300 p-3 border-2 border-black rounded-lg shadow-hard-sm hover:shadow-hard-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                                aria-label="New search"
                            >
                                <SearchIcon className="w-6 h-6 text-black"/>
                            </button>
                         </div>
                    )}

                    <div className={`
                        ${(hasNews && isFormCollapsed) ? 'hidden' : 'block'}
                        w-full bg-white border-2 border-black rounded-lg shadow-hard-md 
                        ${hasNews ? 'p-4 max-w-sm' : 'p-4 mb-8'}
                    `}>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {hasNews && (
                                 <div className="flex justify-between items-center -mb-2">
                                    <h2 className="font-display font-bold text-lg">New Vibe</h2>
                                    <button type="button" onClick={() => setIsFormCollapsed(true)} aria-label="Close search form" className="p-1 hover:text-red-500 transition-colors">
                                        <CloseIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., 'global tech trends'"
                                    className="w-full border-2 border-black rounded-md pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    aria-label="News topic"
                                    disabled={isCustomSource}
                                />
                            </div>
                            <div className="relative">
                                <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., 'San Francisco, CA'"
                                    className="w-full border-2 border-black rounded-md pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    aria-label="Location"
                                    disabled={isCustomSource}
                                />
                            </div>

                            <div className="border-t-2 border-dashed border-gray-300 pt-3 flex flex-col gap-3">
                                <button type="button" onClick={() => setIsRssExpanded(!isRssExpanded)} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors w-fit">
                                    <RssIcon className="w-4 h-4" />
                                    <span>{isRssExpanded ? 'Hide' : 'Add'} Custom Source (RSS/OPML)</span>
                                </button>
                                {isRssExpanded && (
                                    <div className="flex flex-col gap-3 animate-fade-in-fast">
                                        <div className="relative">
                                            <RssIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                type="url"
                                                value={rssUrl}
                                                onChange={handleRssUrlChange}
                                                placeholder="Paste RSS Feed URL"
                                                className="w-full border-2 border-black rounded-md pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                                aria-label="RSS Feed URL"
                                            />
                                        </div>
                                        <div className="text-center text-xs text-gray-400 font-bold">OR</div>
                                        <div>
                                            <label htmlFor="opml-upload" className="w-full text-center cursor-pointer bg-gray-50 text-black font-bold px-4 py-3 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all block truncate">
                                                {opmlFile ? `Selected: ${opmlFile.name}` : 'Upload OPML File'}
                                            </label>
                                            <input
                                                type="file"
                                                id="opml-upload"
                                                accept=".opml,.xml"
                                                onChange={handleOpmlFileChange}
                                                className="hidden"
                                                aria-label="Upload OPML File"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button type="submit" disabled={isLoading} className="flex-grow bg-yellow-300 text-black font-bold px-6 py-3 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-hard-sm disabled:translate-x-0 disabled:translate-y-0">
                                    Get Vibes
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleSaveVibe} 
                                    disabled={opmlFile !== null || (rssUrl.trim() === '' && (!topic.trim() || !location.trim()))}
                                    className="sm:w-auto bg-cyan-300 text-black font-bold px-6 py-3 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-hard-sm disabled:translate-x-0 disabled:translate-y-0"
                                    aria-label="Save current vibe"
                                >
                                    Save Vibe
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <main className={`w-full max-w-2xl flex-grow flex flex-col justify-center transition-all duration-500 ease-in-out ${hasNews ? 'pt-20' : ''}`}>
                    {renderContent()}
                </main>

                <footer className="w-full max-w-2xl mt-8 text-center text-xs text-gray-400">
                    <p>Powered by Gemini. Built with React & Tailwind CSS.</p>
                </footer>
            </div>
        </>
    );
}