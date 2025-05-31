import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Sparkles, Clock, Hash, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { storyAPI } from '../utils/api';
import toast from 'react-hot-toast';

function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [storyPassword, setStoryPassword] = useState(''); // Store password for chapter generation
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchStory();
  }, [id]);

  const fetchStory = async () => {
    try {
      const response = await storyAPI.getStory(id);
      setStory(response.data);
      setIsProtected(false);
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresPassword) {
        // Story is password protected
        setStory(error.response.data.story);
        setIsProtected(true);
        setShowPasswordModal(true);
      } else {
        toast.error('Failed to fetch story');
        console.error('Error fetching story:', error);
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordVerification = async (e) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Please enter the password');
      return;
    }

    setVerifyingPassword(true);

    try {
      const response = await storyAPI.verifyStoryPassword(id, password);
      setStory(response.data);
      setStoryPassword(password); // Store for future chapter generation
      setIsProtected(false);
      setShowPasswordModal(false);
      setPassword('');
      toast.success('Story unlocked successfully');
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Incorrect password');
      } else {
        toast.error('Failed to verify password');
      }
      console.error('Error verifying password:', error);
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleGenerateChapter = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setGenerating(true);

    try {
      const response = await storyAPI.generateChapter(id, prompt.trim(), storyPassword || null);
      const newChapter = response.data;
      
      setStory(prevStory => ({
        ...prevStory,
        chapters: [...(prevStory.chapters || []), newChapter]
      }));
      
      setPrompt('');
      setShowPrompt(false);
      toast.success('New chapter generated!');
      
      // Scroll to the new chapter
      setTimeout(() => {
        const newChapterElement = document.getElementById(`chapter-${newChapter.chapter_number}`);
        if (newChapterElement) {
          newChapterElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Password required to continue this story');
        setShowPasswordModal(true);
      } else {
        toast.error('Failed to generate chapter');
      }
      console.error('Error generating chapter:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mb-4"></div>
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Story not found</h3>
        <button onClick={() => navigate('/')} className="btn-primary">
          Back to Stories
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Stories</span>
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{story.title}</h1>
              {story.is_protected && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Protected</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {story.genre && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  {story.genre}
                </span>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Updated {formatDate(story.updated_at)}</span>
              </div>
              <div className="flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                <span>{story.chapters?.length || 0} chapters</span>
              </div>
            </div>
          </div>
          
          {!isProtected && (
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="btn-primary flex items-center space-x-2"
              disabled={generating}
            >
              <Plus className="h-4 w-4" />
              <span>Continue Story</span>
            </button>
          )}
        </div>
      </div>

      {/* Protected Story Message */}
      {isProtected && (
        <div className="card mb-8 border-amber-200 bg-amber-50">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-6 w-6 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800">Story Protected</h3>
          </div>
          <p className="text-amber-700 mb-4">
            This story is password protected. Enter the correct password to view and continue the story.
          </p>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Lock className="h-4 w-4" />
            <span>Enter Password</span>
          </button>
        </div>
      )}

      {/* Prompt Input */}
      {showPrompt && !isProtected && (
        <div className="card mb-8 animate-slide-up">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Continue Your Story</h3>
          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What happens next? Describe the direction you want the story to take..."
              className="textarea-field"
              rows="4"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowPrompt(false)}
                className="btn-secondary"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateChapter}
                disabled={generating || !prompt.trim()}
                className="btn-primary flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Chapter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapters */}
      {!isProtected && (
        <div className="space-y-8">
          {story.chapters && story.chapters.length > 0 ? (
            story.chapters.map((chapter) => (
              <div
                key={chapter.id}
                id={`chapter-${chapter.chapter_number}`}
                className="card animate-fade-in"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Chapter {chapter.chapter_number}
                    {chapter.title && `: ${chapter.title}`}
                  </h2>
                  <div className="text-sm text-gray-500">
                    {formatDate(chapter.created_at)}
                  </div>
                </div>
                
                <div className="story-content text-gray-800 leading-relaxed">
                  {chapter.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
                
                {chapter.summary && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Chapter Summary</h4>
                    <p className="text-sm text-gray-600 italic">{chapter.summary}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters yet</h3>
              <p className="text-gray-600 mb-4">Start writing your story by adding the first chapter</p>
              <button
                onClick={() => setShowPrompt(true)}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Start Writing</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Continue Button (always visible at bottom) */}
      {!isProtected && story.chapters && story.chapters.length > 0 && !showPrompt && (
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowPrompt(true)}
            className="btn-primary flex items-center space-x-2 mx-auto"
            disabled={generating}
          >
            <Plus className="h-4 w-4" />
            <span>Continue Story</span>
          </button>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Enter Password
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              This story is password protected. Enter the password to access "{story.title}".
            </p>

            <form onSubmit={handlePasswordVerification} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter story password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn-secondary"
                  disabled={verifyingPassword}
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={verifyingPassword || !password}
                  className="btn-primary flex items-center space-x-2"
                >
                  {verifyingPassword ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Unlock Story</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryDetail; 