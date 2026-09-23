'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface WikiPage {
  id: string;
  title: string;
  category: string;
  url: string;
  summary: string;
  environmentalConcerns: string[];
  communityImpacts: string[];
  dataCenterProjects: string[];
  wikiUrl: string;
}

interface PagesData {
  totalPages: number;
  categories: string[];
  pages: WikiPage[];
}

export default function IssuesPage() {
  const [pagesData, setPagesData] = useState<PagesData | null>(null);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/issues?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPagesData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load pages');
      }
    } catch (err) {
      setError('Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Loudoun County Pages</h1>
              <p className="text-sm text-gray-600 mt-1">
                {pagesData?.totalPages} pages across {pagesData?.categories.length} categories
              </p>
            </div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Chat
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {pagesData?.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {(searchTerm || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-700">Pages List</h2>
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {pagesData?.pages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No pages found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pagesData?.pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => setSelectedPage(page)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedPage?.id === page.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {page.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {page.url}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 shrink-0 capitalize">
                            {page.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedPage ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-3 capitalize">
                        {selectedPage.category}
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedPage.title}
                      </h2>
                      <p className="text-gray-500 text-sm mt-2 break-all">
                        {selectedPage.url}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={selectedPage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Source
                      </a>
                      <Link
                        href={selectedPage.wikiUrl}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        Wiki
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedPage.summary}
                    </p>
                  </div>

                  {selectedPage.dataCenterProjects.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Center Projects</h3>
                      <ul className="space-y-2">
                        {selectedPage.dataCenterProjects.map((project, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{project}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedPage.environmentalConcerns.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Environmental Concerns</h3>
                      <ul className="space-y-2">
                        {selectedPage.environmentalConcerns.map((concern, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedPage.communityImpacts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Community Impacts</h3>
                      <ul className="space-y-2">
                        {selectedPage.communityImpacts.map((impact, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{impact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Page</h3>
                <p className="text-gray-500">
                  Click on any page from the list to view details, source links, and the AI-generated wiki.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
