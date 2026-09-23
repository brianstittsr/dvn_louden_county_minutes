import Link from 'next/link';

interface FeedAccount {
  name: string;
  handle?: string;
  url: string;
  description?: string;
}

interface FeedCategory {
  platform: string;
  icon: string;
  accounts: FeedAccount[];
}

const FEED_CATEGORIES: FeedCategory[] = [
  {
    platform: 'X (Twitter)',
    icon: '𝕏',
    accounts: [
      { name: 'County Government', handle: '@LoudounCoGovt', url: 'https://x.com/LoudounCoGovt', description: 'Main county news and updates' },
      { name: 'Economic Development', handle: '@LoudounBiz', url: 'https://x.com/LoudounBiz', description: 'Business & data-center industry news' },
      { name: 'Small Business Development', handle: '@LoudounSmallBiz', url: 'https://x.com/LoudounSmallBiz' },
      { name: 'Rural Economic Development', handle: '@LoudounFarms', url: 'https://x.com/LoudounFarms' },
      { name: 'Sheriff\'s Office', handle: '@LoudounSheriff', url: 'https://x.com/LoudounSheriff' },
      { name: 'Fire & Rescue', handle: '@LoudounFire', url: 'https://x.com/LoudounFire' },
      { name: 'Health Department', handle: '@LoudounCoHealth', url: 'https://x.com/LoudounCoHealth' },
      { name: 'Elections & Voter Registration', handle: '@Loudounvote', url: 'https://x.com/Loudounvote' },
      { name: 'Green Loudoun (Recycling & Waste)', handle: '@GreenLoudoun', url: 'https://x.com/GreenLoudoun', description: 'Environment & sustainability' },
      { name: 'Mapping & GIS', handle: '@LoudounMapping', url: 'https://x.com/LoudounMapping' },
      { name: 'Public Library', handle: '@LoudounLibrary', url: 'https://x.com/LoudounLibrary' },
      { name: 'Parks, Recreation & Community Services', handle: '@LoudounPRCS', url: 'https://x.com/LoudounPRCS' },
      { name: 'Animal Services', handle: '@LoudounAnimals', url: 'https://x.com/LoudounAnimals' },
      { name: 'Commonwealth\'s Attorney', handle: '@LoudounOCA', url: 'https://x.com/LoudounOCA' },
    ],
  },
  {
    platform: 'Bluesky',
    icon: '🦋',
    accounts: [
      { name: 'County Government', handle: '@loudoun.gov', url: 'https://bsky.app/profile/loudoun.gov' },
    ],
  },
  {
    platform: 'Facebook',
    icon: '📘',
    accounts: [
      { name: 'County Government', url: 'https://www.facebook.com/LoudounCountyVa/' },
      { name: 'Economic Development', url: 'https://www.facebook.com/LoudounEconomicDevelopment' },
      { name: 'Fire & Rescue', url: 'https://www.facebook.com/LoudounFireRescue/' },
      { name: 'Sheriff\'s Office', url: 'https://www.facebook.com/LoudounSheriff' },
      { name: 'Green Loudoun', url: 'https://www.facebook.com/GreenLoudoun' },
      { name: 'Health Department', url: 'https://www.facebook.com/LoudounCountyHealthDept/' },
    ],
  },
  {
    platform: 'YouTube',
    icon: '▶️',
    accounts: [
      { name: 'County Government (meeting videos)', url: 'https://www.youtube.com/user/loudouncountyva', description: 'Board of Supervisors & Planning Commission meetings' },
      { name: 'Economic Development', url: 'https://www.youtube.com/user/LoudounVAEcoDev' },
    ],
  },
  {
    platform: 'LinkedIn',
    icon: '💼',
    accounts: [
      { name: 'County Government', url: 'https://linkedin.com/company/loudoun-county' },
      { name: 'Economic Development', url: 'https://www.linkedin.com/company/loudoun-economic-development' },
    ],
  },
  {
    platform: 'RSS & Alerts',
    icon: '📡',
    accounts: [
      { name: 'County RSS Feeds', url: 'https://www.loudoun.gov/rss.aspx', description: 'News, meetings, and alert feeds' },
      { name: 'News Flash / Notify Me', url: 'https://www.loudoun.gov/list.aspx', description: 'Email & text alert subscriptions' },
    ],
  },
];

const DATA_CENTER_LINKS = [
  { name: 'Data Centers in Loudoun County', url: 'https://www.loudoun.gov/6188/Data-Centers-in-Loudoun-County' },
  { name: 'Data Center Standards & Locations', url: 'https://www.loudoun.gov/5990/Data-Center-Standards-Locations' },
  { name: 'Phase 2: Data Center Standards & Locations', url: 'https://www.loudoun.gov/6222/Phase-2-Data-Center-Standards-Locations' },
  { name: 'Noise & Air Quality Concerns', url: 'https://www.loudoun.gov/6405/Noise-Air-Quality-Concerns' },
  { name: 'Transmission Lines in Loudoun County', url: 'https://www.loudoun.gov/TransmissionLines' },
  { name: 'Board of Supervisors Meeting Documents', url: 'https://www.loudoun.gov/4829/Board-of-Supervisors-Meeting-Documents' },
  { name: 'Meeting Videos (Granicus)', url: 'https://www.loudoun.gov/2203/Meeting-Videos' },
  { name: 'LandMARC (land applications)', url: 'https://www.loudoun.gov/LandMARC' },
  { name: 'Social Media Central', url: 'https://www.loudoun.gov/4842/Social-Media-Central' },
];

export default function FeedsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Official County Feeds</h1>
              <p className="text-blue-200 mt-2 text-lg">Loudoun County social media accounts, RSS feeds, and data-center resources</p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-white text-blue-900 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all hover:shadow-xl self-start"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">Data Center Resources</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DATA_CENTER_LINKS.map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-emerald-800 font-medium text-sm transition-colors"
              >
                <span className="text-emerald-600">↗</span>
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {FEED_CATEGORIES.map(category => (
          <div key={category.platform} className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl text-white">{category.icon}</span>
              <h2 className="text-xl font-bold text-white">{category.platform}</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {category.accounts.map(account => (
                <li key={account.url}>
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-6 py-3 hover:bg-blue-50 transition-colors group"
                  >
                    <div>
                      <span className="font-medium text-gray-800 group-hover:text-blue-700">{account.name}</span>
                      {account.handle && (
                        <span className="ml-2 text-sm text-blue-600">{account.handle}</span>
                      )}
                      {account.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{account.description}</p>
                      )}
                    </div>
                    <span className="text-gray-400 group-hover:text-blue-600">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p>Loudoun County Data Center Research Knowledge Base</p>
          <p className="text-sm mt-2">Feed list sourced from loudoun.gov/4842/Social-Media-Central</p>
        </div>
      </footer>
    </main>
  );
}
