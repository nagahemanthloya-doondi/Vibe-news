import React, { useState, useRef } from 'react';
import type { NewsArticle, GroundingChunk } from '../types';
import { ShareIcon } from './icons/ShareIcon';

interface NewsCardProps {
    article: NewsArticle;
    sources: GroundingChunk[];
    cardIndex: number;
    onNext: () => void;
    onPrev: () => void;
    onSwipeAway: () => void;
    onSnapBack: () => void;
    onClick: () => void;
}

const sectionColors = [
    'bg-yellow-300',
    'bg-cyan-300',
    'bg-pink-300',
    'bg-lime-300',
    'bg-orange-300',
];

const getSectionColor = (index: number) => sectionColors[index % sectionColors.length];

export const NewsCard: React.FC<NewsCardProps> = ({ article, sources, onNext, onPrev, onSwipeAway, onSnapBack, onClick }) => {
    const [dragState, setDragState] = useState({
        isDragging: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
    });
    const cardRef = useRef<HTMLDivElement>(null);
    const hasSwiped = useRef(false);
    const dragDirection = useRef<'horizontal' | 'vertical' | null>(null);
    const dragStartTimeRef = useRef<number>(0);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        hasSwiped.current = false;
        dragDirection.current = null;
        dragStartTimeRef.current = Date.now();
        const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
        setDragState({
            isDragging: true,
            startX: clientX,
            startY: clientY,
            offsetX: 0,
        });
    };

    const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!dragState.isDragging) return;
        
        const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;

        if (dragDirection.current === null) {
            const deltaX = Math.abs(clientX - dragState.startX);
            const deltaY = Math.abs(clientY - dragState.startY);
            const threshold = 5;

            if (deltaX > threshold || deltaY > threshold) {
                dragDirection.current = deltaX > deltaY ? 'horizontal' : 'vertical';
            }
        }
        
        if (dragDirection.current === 'horizontal') {
            e.preventDefault();
            const offsetX = clientX - dragState.startX;
            setDragState(prev => ({ ...prev, offsetX }));
        }
    };

    const handleDragEnd = () => {
        if (!dragState.isDragging || hasSwiped.current) return;

        const dragDuration = Date.now() - dragStartTimeRef.current;
        const dragDistance = Math.abs(dragState.offsetX);

        // Click detection
        if (dragDuration < 250 && dragDistance < 10 && dragDirection.current !== 'vertical') {
            setDragState(prev => ({ ...prev, isDragging: false, offsetX: 0 }));
            dragDirection.current = null;
            onClick();
            return;
        }
        
        if (dragDirection.current === 'horizontal') {
            const cardWidth = cardRef.current?.offsetWidth ?? 0;
            const threshold = cardWidth / 4;

            if (Math.abs(dragState.offsetX) > threshold) {
                hasSwiped.current = true;
                onSwipeAway();
                const direction = dragState.offsetX < 0 ? -1 : 1;
                const exitX = direction * (cardWidth + 50);
                setDragState(prev => ({ ...prev, isDragging: false, offsetX: exitX }));

                setTimeout(() => {
                    if (direction === -1) onNext();
                    else onPrev();
                }, 300);
            } else {
                onSnapBack();
                setDragState(prev => ({ ...prev, isDragging: false, offsetX: 0 }));
            }
        } else {
            setDragState(prev => ({ ...prev, isDragging: false, offsetX: 0 }));
        }
        
        dragDirection.current = null;
    };
    
    const handleShare = async () => {
        if (!navigator.share) {
            alert("Share feature is not supported in your browser.");
            return;
        }

        const shareData = {
            title: article.headline,
            text: article.summary,
            url: sources.find(s => s.web?.uri)?.web?.uri || window.location.href,
        };
        
        try {
            await navigator.share(shareData);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error sharing article:', error);
            alert("Oops! Something went wrong while trying to share.");
        }
    };
    
    const rotation = dragState.offsetX / 20;
    const transform = `translateX(${dragState.offsetX}px) rotate(${rotation}deg)`;
    const transition = !dragState.isDragging 
        ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' 
        : 'none';

    return (
        <div className="transition-transform duration-300 ease-in-out hover:scale-[1.01]">
            <div 
                ref={cardRef}
                className="bg-white border-2 border-black rounded-lg shadow-hard-md w-full max-w-2xl mx-auto font-sans animate-fade-in cursor-grab active:cursor-grabbing hover:shadow-hard-lg"
                style={{ 
                    transform, 
                    transition,
                    touchAction: 'pan-y'
                }}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
            >
                <div className="p-2 border-b-2 border-black">
                    <img src={article.imageUrl} alt={article.headline} className="w-full h-48 md:h-64 object-cover border-2 border-black rounded" />
                </div>

                <div className="flex flex-col">
                    <div className={`${getSectionColor(0)} p-4 md:p-6 border-b-2 border-black`}>
                        <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-wider text-black">{article.headline}</h2>
                    </div>

                    <div className={`${getSectionColor(1)} p-4 md:p-6 border-b-2 border-black`}>
                        <h3 className="font-bold text-sm uppercase tracking-widest mb-2">Summary</h3>
                        <p className="text-gray-800">{article.summary}</p>
                    </div>

                    <div className={`${getSectionColor(2)} p-4 md:p-6 border-b-2 border-black`}>
                        <h3 className="font-bold text-sm uppercase tracking-widest mb-2">Key Details</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-800">
                            {article.keyDetails.map((detail, index) => (
                                <li key={index}>{detail}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className={`${getSectionColor(3)} p-4 md:p-6`}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-sm uppercase tracking-widest">Sources</h3>
                            {typeof navigator.share === 'function' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                    className="p-2 border-2 border-black rounded-md bg-white/50 hover:bg-white/80 transition-all shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                    aria-label="Share this article"
                                >
                                    <ShareIcon className="w-5 h-5 text-black" />
                                </button>
                            )}
                        </div>
                        {sources.length > 0 ? (
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
                        ) : (
                            <p className="text-sm text-gray-700 italic">No external sources cited.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};