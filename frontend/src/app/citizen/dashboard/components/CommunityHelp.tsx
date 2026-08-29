'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi } from '@/lib/api';
import { HeartHandshake, Plus, CheckCircle2, Phone, MapPin, Tag, RefreshCw, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export interface HelpPost {
  _id: string;
  postedBy: string;
  type: 'offer' | 'request';
  title: string;
  description: string;
  category: 'food' | 'shelter' | 'medical' | 'transport' | 'clothing' | 'other';
  state: string;
  district: string;
  contactNumber: string;
  status: 'open' | 'fulfilled';
  createdAt: string;
}

const CATEGORIES = ['food', 'shelter', 'medical', 'transport', 'clothing', 'other'] as const;
type CategoryType = (typeof CATEGORIES)[number];

export default function CommunityHelp() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-posts' | 'create'>('browse');
  const [posts, setPosts] = useState<HelpPost[]>([]);
  const [myPosts, setMyPosts] = useState<HelpPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('open');

  // Form State
  const [formType, setFormType] = useState<'offer' | 'request'>('request');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CategoryType>('food');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        if (activeTab === 'browse') {
          const params = new URLSearchParams();
          if (filterType) params.append('type', filterType);
          if (filterCategory) params.append('category', filterCategory);
          if (filterStatus) params.append('status', filterStatus);

          const queryString = params.toString();
          const endpoint = `/help-posts${queryString ? `?${queryString}` : ''}`;

          const response = await fetchFromApi<HelpPost[]>(endpoint);
          if (isMounted) {
            if (response.success && Array.isArray(response.data)) {
              setPosts(response.data);
              setError(null);
            } else {
              setError(response.message || response.error || 'Failed to retrieve help board posts');
            }
          }
        } else if (activeTab === 'my-posts') {
          const response = await fetchFromApi<HelpPost[]>('/help-posts/my-posts');
          if (isMounted) {
            if (response.success && Array.isArray(response.data)) {
              setMyPosts(response.data);
              setError(null);
            } else {
              setError(response.message || response.error || 'Failed to load your personal help posts');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching help posts:', err);
        if (isMounted) {
          setError('Unable to load community help board');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, filterType, filterCategory, filterStatus, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      const payload = {
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        state: formState.trim(),
        district: formDistrict.trim(),
        contactNumber: formContactNumber.trim(),
      };

      const response = await fetchFromApi<HelpPost>('/help-posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        setFormFeedback({
          type: 'success',
          message: 'Your help listing has been posted to the community board!',
        });
        setFormTitle('');
        setFormDescription('');
        setFormState('');
        setFormDistrict('');
        setFormContactNumber('');
        setTimeout(() => {
          setIsLoading(true);
          setActiveTab('browse');
          setRefreshTrigger((prev) => prev + 1);
        }, 1000);
      } else {
        setFormFeedback({
          type: 'error',
          message: response.message || response.error || 'Failed to publish post',
        });
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setFormFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to publish help post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFulfillPost = async (postId: string) => {
    if (!confirm('Mark this request/offer as fulfilled?')) return;

    try {
      const response = await fetchFromApi(`/help-posts/${postId}/fulfill`, {
        method: 'PATCH',
      });

      if (response.success) {
        setIsLoading(true);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(response.message || response.error || 'Failed to update post status');
      }
    } catch (err) {
      console.error('Error fulfilling post:', err);
      alert('Error marking post as fulfilled');
    }
  };

  return (
    <section id="community-help" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600">
              Peer Support & Mutual Aid
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Community Board
            </span>
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            Community Aid & Resource Exchange
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Connect with fellow citizens to request emergency supplies or offer local assistance.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-2xl bg-slate-100 p-1 self-start">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setActiveTab('browse');
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'browse'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Browse Posts
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setActiveTab('my-posts');
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'my-posts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Listings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'create'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            New Post
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreatePost} className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h4 className="font-bold text-slate-900 text-base">Create a Community Aid Listing</h4>
          </div>

          {formFeedback && (
            <div
              className={`p-3 rounded-xl text-xs ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {formFeedback.message}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setFormType('request')}
              className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                formType === 'request'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              Seeking Help / Request
            </button>
            <button
              type="button"
              onClick={() => setFormType('offer')}
              className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                formType === 'offer'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              Offering Assistance
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title / Headline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Need drinking water packets for 4 families"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detail what is needed or being provided, exact spot, urgent timings..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resource Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as CategoryType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Direct Contact Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formContactNumber}
                onChange={(e) => setFormContactNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState}
                onChange={(e) => setFormState(e.target.value)}
                placeholder="e.g. Uttar Pradesh"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formDistrict}
                onChange={(e) => setFormDistrict(e.target.value)}
                placeholder="e.g. Prayagraj"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Publish to Board
            </button>
          </div>
        </form>
      )}

      {/* BROWSE TAB */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
            <select
              value={filterType}
              onChange={(e) => {
                setIsLoading(true);
                setFilterType(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Types</option>
              <option value="request">Requests Only</option>
              <option value="offer">Offers Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => {
                setIsLoading(true);
                setFilterCategory(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setIsLoading(true);
                setFilterStatus(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="open">Open Only</option>
              <option value="fulfilled">Fulfilled Only</option>
              <option value="">All Statuses</option>
            </select>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-400">
              <RefreshCw className="mb-2 h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-sm">Loading community board entries...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
              <HeartHandshake className="mb-2 h-8 w-8 text-slate-300" />
              <h4 className="font-bold text-slate-700">No active posts match criteria</h4>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Be the first to offer assistance or publish a request for urgent resources.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => {
                const isOffer = post.type === 'offer';
                return (
                  <div
                    key={post._id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-slate-300 hover:bg-white hover:shadow-md"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            isOffer
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                              : 'border-red-200 bg-red-100 text-red-800'
                          }`}
                        >
                          {isOffer ? 'Aid Offer' : 'Help Request'}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          <Tag className="h-2.5 w-2.5 text-slate-500" />
                          {post.category}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base">{post.title}</h4>

                      <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">
                        {post.description}
                      </p>

                      <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {post.district}, {post.state}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <a
                        href={`tel:${post.contactNumber}`}
                        className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {post.contactNumber}
                      </a>

                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MY POSTS TAB */}
      {activeTab === 'my-posts' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-slate-400">
              <RefreshCw className="mb-2 h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-sm">Fetching your community listings...</p>
            </div>
          ) : myPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
              <HeartHandshake className="mb-2 h-8 w-8 text-slate-300" />
              <h4 className="font-bold text-slate-700">You haven&apos;t created any listings yet</h4>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Post your first offer/request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myPosts.map((post) => (
                <div
                  key={post._id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          post.type === 'offer'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : 'border-red-200 bg-red-100 text-red-800'
                        }`}
                      >
                        {post.type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          post.status === 'fulfilled'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900">{post.title}</h4>
                    <p className="text-xs text-slate-600">{post.description}</p>
                  </div>

                  {post.status !== 'fulfilled' && (
                    <button
                      type="button"
                      onClick={() => handleFulfillPost(post._id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-300 hover:text-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Mark as Fulfilled
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
