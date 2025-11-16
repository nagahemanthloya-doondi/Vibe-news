import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { TrashIcon } from './icons/TrashIcon';
import type { SavedVibe } from '../types';

interface TopicsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    vibes: SavedVibe[];
    onSelectVibe: (vibe: SavedVibe) => void;
    onDeleteVibe: (vibe: SavedVibe) => void;
}

const topicColors = [
    'bg-yellow-300',
    'bg-cyan-300',
    'bg-pink-300',
    'bg-lime-300',
    'bg-orange-300',
];

export const TopicsPanel: React.FC<TopicsPanelProps> = ({ isOpen, onClose, vibes, onSelectVibe, onDeleteVibe }) => {
    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <aside
                className={`fixed top-0 left-0 h-full w-full max-w-sm bg-white border-r-2 border-black shadow-hard-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="topics-panel-title"
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b-2 border-black">
                        <h2 id="topics-panel-title" className="font-display text-2xl font-black uppercase">Saved Vibes</h2>
                        <button
                            onClick={onClose}
                            className="p-1 border-2 border-transparent hover:border-black rounded-md transition-all"
                            aria-label="Close saved vibes panel"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Topics List */}
                    <div className="flex-grow p-4 overflow-y-auto">
                        {vibes.length > 0 ? (
                            <ul className="space-y-3">
                                {vibes.map((vibe, index) => (
                                    <li key={index} className="flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => onSelectVibe(vibe)}
                                            className={`${topicColors[index % topicColors.length]} w-full text-left text-black p-3 border-2 border-black rounded-md shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black`}
                                        >
                                            <span className="font-bold block truncate">{vibe.topic}</span>
                                            {vibe.rssUrl ? (
                                                <span className="text-sm text-gray-700 block truncate" title={vibe.rssUrl}>{vibe.rssUrl}</span>
                                            ) : (
                                                <span className="text-sm text-gray-700">{vibe.location}</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onDeleteVibe(vibe)}
                                            className="p-2 border-2 border-black rounded-md bg-red-400 shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                            aria-label={`Delete vibe: ${vibe.topic} for location ${vibe.location}`}
                                        >
                                            <TrashIcon className="w-5 h-5 text-black" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                                <p className="font-bold">No saved vibes yet.</p>
                                <p className="text-sm mt-1">Use the 'Save Vibe' button to save a topic and location.</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};