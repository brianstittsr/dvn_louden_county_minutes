'use client';

import { useState, useEffect } from 'react';
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

interface PagesByCategory {
  category: string;
  pages: WikiPage[];
}

export default function WikiArchivePage() {
  const [pagesByCategory, setPagesByCategory] = useState<PagesByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const response = await fetch('/api/issues');
      const data = await response.json();

      if (data.success && data.pagesByCategory) {
        setPagesByCategory(data.pagesByCategory);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPages = pagesByCategory.map(categoryGroup => ({
    ...categoryGroup,
    pages: categoryGroup.pages.filter(page => {
      const matchesCategory = !selectedCategory || page.category === selectedCategory;
      const matchesSearch = !searchTerm ||
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.environmentalConcerns.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
        page.communityImpacts.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    }),
  })).filter(categoryGroup => categoryGroup.pages.length > 0);

  const allCategories = pagesByCategory.map(c => c.category);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Wiki Archive</h1>
              <p className="text-blue-200 mt-1">Loudoun County Data Center Knowledge Base</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
                {allCategories.map(category => (
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
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">No pages found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredPages.map((categoryGroup) => (
              <div key={categoryGroup.category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 capitalize">{categoryGroup.category}</h2>
                  <p className="text-sm text-gray-600">{categoryGroup.pages.length} pages</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {categoryGroup.pages.map((page) => (
                    <div key={page.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {page.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {page.url}
                          </p>
                          {page.summary && (
                            <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                              {page.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                          >
                            Source
                          </a>
                          <Link
                            href={page.wikiUrl}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                          >
                            Wiki
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
