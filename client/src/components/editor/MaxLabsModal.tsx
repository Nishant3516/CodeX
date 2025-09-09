import React from "react";
import { X, Clock, AlertTriangle } from "lucide-react";

interface MaxLabsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaxLabsModal: React.FC<MaxLabsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const funnyMessages = [
    "Our servers are giving someone else their full attention, just like your ex probably is right now. Please wait. 👀",
    "Waking a server from its peaceful slumber just to cater to your whim. It's fine, it probably didn't have dreams anyway. 😩",
    "This is taking longer than your last relationship, isn't it? Our servers are also considering ghosting you. 👻",
    "Too many requests have triggered an existential spiral in our servers. You'll get your lab when they're done contemplating the void. Or when we replace them. 🤷",
    "The server is currently processing someone more important than you. Please hold while we re-evaluate your life choices 📉",
    `"Are we there yet?" No. And every time you impatiently wonder, we add another minute to the queue. 😈`,
    "The server is busy. Try refreshing your page, or maybe your life goals. One of them is bound to work eventually. 🔮",
    "All labs are currently occupied. This is what happens when everyone thinks they're the main character. 🤡",
  ];

  const randomMessage =
    funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-['Poppins']">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Service Unavailable</h2>
              <p className="text-sm text-gray-400">Maximum Capacity Reached</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-300 text-base leading-relaxed">
              {randomMessage}
            </p>
          </div>

          {/* Wait Time Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-md text-gray-300 text-center">
              Please try again in approximately <span className="text-white font-semibold">1 hour</span>
            </p>
            <p className="text-xs text-center text-blue-400">If its already past an hour, try reading the message again</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
            >
              Understood
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
            >
              I'm an Idiot 🤡
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 text-center">
            Our servers are working hard to serve you better. Thank you for your patience.
          </p>
        </div>
      </div>
    </div>
  );
};
