import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Calendar, Trash2, Eye, Lock, Unlock, Shield } from 'lucide-react';
import { storyAPI } from '../utils/api';
import toast from 'react-hot-toast';

function Home() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [password, setPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await storyAPI.getStories();
      setStories(response.data);
    } catch (error) {
      toast.error('Failed to fetch stories');
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async (storyId, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await storyAPI.deleteStory(storyId);
      setStories(stories.filter(story => story.id !== storyId));
      toast.success('Story deleted successfully');
    } catch (error) {
      toast.error('Failed to delete story');
      console.error('Error deleting story:', error);
    }
  };

  const handleSetPassword = (story) => {
    setSelectedStory(story);
    setPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || password.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }

    setSettingPassword(true);

    try {
      await storyAPI.setStoryPassword(selectedStory.id, password);
      
      // Update the story in the list
      setStories(stories.map(story => 
        story.id === selectedStory.id 
          ? { ...story, is_protected: 1 }
          : story
      ));
      
      toast.success('Password protection enabled');
      setShowPasswordModal(false);
      setPassword('');
      setSelectedStory(null);
    } catch (error) {
      toast.error('Failed to set password');
      console.error('Error setting password:', error);
    } finally {
      setSettingPassword(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mb-4"></div>
          <p className="text-gray-600">Loading your stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Stories</h1>
          <p className="text-gray-600">Create and continue your AI-generated fiction adventures</p>
        </div>
        <Link 
          to="/create" 
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Story</span>
        </Link>
      </div>

      {/* Stories Grid */}
      {stories.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No stories yet</h3>
          <p className="text-gray-600 mb-6">Start your creative journey by writing your first story</p>
          <Link 
            to="/create" 
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Your First Story</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div key={story.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {story.title}
                    </h3>
                    {story.is_protected ? (
                      <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" title="Password protected" />
                    ) : (
                      <Unlock className="h-4 w-4 text-gray-400 flex-shrink-0" title="Not protected" />
                    )}
                  </div>
                  {story.genre && (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                      {story.genre}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteStory(story.id, story.title)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                  title="Delete story"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Updated {formatDate(story.updated_at)}</span>
              </div>

              <div className="flex items-center justify-between space-x-2">
                {!story.is_protected && (
                  <button
                    onClick={() => handleSetPassword(story)}
                    className="btn-secondary flex items-center space-x-2 text-sm"
                    title="Set password protection"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Protect</span>
                  </button>
                )}
                
                <Link
                  to={`/story/${story.id}`}
                  className="btn-primary flex items-center space-x-2 flex-1 justify-center"
                >
                  <Eye className="h-4 w-4" />
                  <span>Continue</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Protect Story
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Set a password to protect "{selectedStory?.title}". You'll need this password to view or edit the story.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password (minimum 4 characters)
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter a secure password"
                  required
                  minLength={4}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setSelectedStory(null);
                  }}
                  className="btn-secondary"
                  disabled={settingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingPassword || password.length < 4}
                  className="btn-primary flex items-center space-x-2"
                >
                  {settingPassword ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Setting...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Protect Story</span>
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

export default Home; 