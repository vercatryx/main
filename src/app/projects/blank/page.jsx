'use client'
import React from 'react';
import { MessageCircle } from 'lucide-react';


export default function Page() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
            <div className="max-w-2xl text-center">
                {/* Main Message */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 mb-8 border border-gray-200 dark:border-gray-700">
                    <div className="mb-6">
                        <svg
                            className="w-20 h-20 mx-auto text-blue-500 dark:text-blue-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Your Project is Coming Soon!
                    </h1>

                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                        We're working hard to build your custom project. This is where your project will be displayed once we have a demo ready for you.
                    </p>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <p className="text-blue-800 dark:text-blue-300 font-medium">
                            🚀 Stay tuned! We'll notify you as soon as your demo is ready.
                        </p>
                    </div>
                </div>
            </div>

            {/* Arrow pointing to chat - animates up and down the full page */}
            <div className="fixed left-8 pointer-events-none animate-bounce-vertical">
                <div className="flex items-center gap-3">
                    {/* Animated Arrow pointing left (outward) */}
                    <svg
                        className="w-12 h-12 text-blue-500 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>

                    <div className="text-left bg-white dark:bg-gray-800 rounded-lg shadow-lg px-5 py-4 border border-gray-200 dark:border-gray-700 max-w-xs">
                        <div className="flex items-start gap-3">
                            {/* Chat Icon - using MessageCircle from lucide-react */}
                            <div className="bg-blue-500 dark:bg-blue-400 rounded-full p-2 flex-shrink-0 mt-0.5">
                                <MessageCircle className="w-5 h-5 text-white dark:text-gray-900" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                    Click on the chat button to chat with your development team directly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom animation for full page vertical bounce */}
            <style jsx>{`
                @keyframes bounce-vertical {
                    0% {
                        top: 10%;
                    }
                    50% {
                        top: 80%;
                    }
                    100% {
                        top: 10%;
                    }
                }

                .animate-bounce-vertical {
                    animation: bounce-vertical 30s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}