import React, { useState, useEffect } from 'react';
import geminiService from '../services/geminiService';

const LlmMonitoring = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    lastRequestTime: null
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Monitor gemini service stats
    const interval = setInterval(() => {
      const serviceStats = geminiService.getStats();
      if (serviceStats) {
        setStats(serviceStats);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const resetStats = () => {
    geminiService.resetStats();
    setStats({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      lastRequestTime: null
    });
  };

  const successRate = stats.totalRequests > 0 ? 
    ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1) : 0;

  return (
    <div className="llm-monitoring">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span className="font-medium">🤖 AI Monitor</span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRequests}</div>
              <div className="text-xs text-gray-500">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successRate}%</div>
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.averageResponseTime > 0 ? `${stats.averageResponseTime.toFixed(0)}ms` : '0ms'}
              </div>
              <div className="text-xs text-gray-500">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalTokensUsed > 0 ? `${(stats.totalTokensUsed / 1000).toFixed(1)}k` : '0'}
              </div>
              <div className="text-xs text-gray-500">Tokens Used</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {stats.lastRequestTime ? 
                `Last request: ${new Date(stats.lastRequestTime).toLocaleTimeString()}` :
                'No requests yet'
              }
            </div>
            <button
              onClick={resetStats}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
            >
              Reset Stats
            </button>
          </div>

          {stats.failedRequests > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <span className="text-red-600 font-medium">
                ⚠️ {stats.failedRequests} failed requests
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LlmMonitoring; 