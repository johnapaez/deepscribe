import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { storyAPI } from '../utils/api';
import toast from 'react-hot-toast';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Adventure', 'Historical Fiction', 'Comedy', 'Drama',
  'Young Adult', 'Crime', 'Supernatural', 'Post-Apocalyptic', 'Other'
];

function CreateStory() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    initialPrompt: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a story title');
      return;
    }

    if (!formData.initialPrompt.trim()) {
      toast.error('Please enter an initial prompt');
      return;
    }

    setLoading(true);

    try {
      // Create the story
      const storyResponse = await storyAPI.createStory({
        title: formData.title.trim(),
        genre: formData.genre || 'Other'
      });

      const storyId = storyResponse.data.id;

      // Generate the first chapter
      await storyAPI.generateChapter(storyId, formData.initialPrompt.trim());

      toast.success('Story created successfully!');
      navigate(`/story/${storyId}`);
    } catch (error) {
      toast.error('Failed to create story. Please try again.');
      console.error('Error creating story:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Story</h1>
        <p className="text-gray-600">Start your creative adventure with AI-powered storytelling</p>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Story Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter your story title..."
              className="input-field"
              required
            />
          </div>

          {/* Genre */}
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">
              Genre
            </label>
            <select
              id="genre"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select a genre...</option>
              {GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Initial Prompt */}
          <div>
            <label htmlFor="initialPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              Story Prompt *
            </label>
            <textarea
              id="initialPrompt"
              name="initialPrompt"
              value={formData.initialPrompt}
              onChange={handleChange}
              placeholder="Describe your story idea, characters, setting, or any starting scenario... The AI will use this to begin your adventure!"
              className="textarea-field"
              rows="6"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Be as detailed or brief as you like. The AI will expand on your ideas!
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Creating Story...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Create Story</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Include specific characters, settings, or conflicts to guide the AI</li>
          <li>• Don't worry about being perfect - you can always guide the story as it develops</li>
          <li>• The AI works best with clear, descriptive prompts</li>
          <li>• You can continue the story by adding new prompts at any time</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateStory;