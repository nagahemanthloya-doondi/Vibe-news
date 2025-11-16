import React, { useEffect, useRef } from 'react';
import type { NewsArticle, GroundingChunk } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface ArticleDetailProps {
    article: NewsArticle;
    sources: GroundingChunk[];
    onClose: () => void;
}

const renderContent = (content: string) => {
    return content.split('\n').map((paragraph, index) => {
        if (paragraph.startsWith('### ')) {
            return <h3 key={index} className="font-display text-xl md:text-2xl font-bold mt-6 mb-3 text-black">{paragraph.substring(4)}</h3>;
        }
        if (paragraph.trim() === '') {
            return null;
        }
        return <p key={index} className="mb-4 text-gray-800 leading-relaxed">{paragraph}</p>;
    });
};

const ArticleSkeleton: React.FC = () => (
    <div className="w-full" aria-label="Loading article content">
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>

        <div className="h-6 bg-gray-300 rounded w-1/2 my-8 animate-pulse"></div>
        
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
        </div>

        <div className="h-6 bg-gray-300 rounded w-1/3 my-8 animate-pulse"></div>

        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
    </div>
);


export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, sources, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Focus the modal when it opens
        modalRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in-fast"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-title"
        >
            <div
                ref={modalRef}
                className="bg-white w-full max-w-3xl h-full max-h-[90vh] border-2 border-black rounded-lg shadow-hard-lg flex flex-col relative animate-slide-up"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                tabIndex={-1} // Make it focusable
            >
                <header className="p-4 flex justify-between items-center border-b-2 border-black bg-yellow-300 rounded-t-md">
                    <h2 id="article-title" className="font-display text-2xl md:text-3xl font-black uppercase tracking-wider text-black flex-1 pr-8">
                        {article.headline}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 border-2 border-black rounded-md bg-white/50 hover:bg-white/80 transition-all"
                        aria-label="Close article detail"
                    >
                        <CloseIcon className="w-6 h-6 text-black" />
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 md:p-8">
                    <img src={article.imageUrl} alt={article.headline} className="w-full h-48 md:h-72 object-cover border-2 border-black rounded-md mb-6" />
                    
                    {!article.fullContent ? (
                        <ArticleSkeleton />
                    ) : (
                         renderContent(article.fullContent)
                    )}

                    {sources.length > 0 && (
                        <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-300">
                             <h3 className="font-display text-lg font-bold uppercase tracking-widest mb-3">Sources</h3>
                             <div className="flex flex-wrap gap-2">
                                {sources.map((source, index) => {
                                    const sourceInfo = source.web || source.maps;
                                    if (!sourceInfo) return null;
                                    return (
                                        <a
                                            key={index}
                                            href={sourceInfo.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-black text-white py-1 px-3 rounded-full hover:bg-gray-700 transition-colors"
                                        >
                                            {new URL(sourceInfo.uri).hostname}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};