import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Edit, Trash2, X } from 'lucide-react';
import { Prize } from '../types';

interface PrizeManagerProps {
  prizes: Prize[];
  onAddPrize: (prize: Omit<Prize, 'id' | 'createdAt'>) => void;
  onUpdatePrize: (id: string, prize: Partial<Prize>) => void;
  onDeletePrize: (id: string) => void;
  selectedPrize: Prize | null;
  onSelectPrize: (prize: Prize | null) => void;
}

const PrizeManager: React.FC<PrizeManagerProps> = ({
  prizes,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  selectedPrize,
  onSelectPrize,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    quota: 1
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPrize) {
      onUpdatePrize(editingPrize.id, {
        name: formData.name,
        description: formData.description,
        image: formData.image,
        quota: formData.quota,
        remainingQuota: formData.quota
      });
      setEditingPrize(null);
    } else {
      onAddPrize({
        name: formData.name,
        description: formData.description,
        image: formData.image,
        quota: formData.quota,
        remainingQuota: formData.quota
      });
    }

    setFormData({ name: '', description: '', image: '', quota: 1 });
    setImageFile(null);
    setImagePreview('');
    setShowAddForm(false);
  };

  const handleEdit = (prize: Prize) => {
    setFormData({
      name: prize.name,
      description: prize.description,
      image: prize.image || '',
      quota: prize.quota
    });
    setImagePreview(prize.image || '');
    setEditingPrize(prize);
    setShowAddForm(true);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG, and WebP files are supported');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setFormData(prev => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  };
  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPrize(null);
    setFormData({ name: '', description: '', image: '', quota: 1 });
    setImageFile(null);
    setImagePreview('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" />
          Data Hadiah ({prizes.length})
        </h2>
        
        { (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Hadiah
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Iphone, Voucher Hotel, SmartWatch"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Keterangan Hadiah..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gambar Hadiah
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                 format: JPG, PNG, WebP (max 2MB)
                </p>
                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Prize preview"
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
              
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kuota Pemenang
              </label>
              <input
                type="number"
                value={formData.quota}
                onChange={(e) => setFormData(prev => ({ ...prev, quota: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ MozAppearance: 'textfield' }}
              />
            </div>  
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingPrize ? 'Update' : 'Tambah'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Kembali
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Prize Display */}
      {selectedPrize && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Hadiah terpilih untuk undian</h3>
              <p className="text-green-700">{selectedPrize.name}</p>
              <p className="text-sm text-green-600">
                Kuota Tersisa: {selectedPrize.remainingQuota}/{selectedPrize.quota}
              </p>
            </div>
            {(
              <button
                onClick={() => onSelectPrize(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prizes List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {prizes.map((prize) => (
            <motion.div
              key={prize.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedPrize?.id === prize.id
                  ? 'border-green-400 bg-green-50'
                  : prize.remainingQuota > 0
                  ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
              onClick={() =>  prize.remainingQuota > 0 && onSelectPrize(prize)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{prize.name}</h3>
                  {prize.description && (
                    <p className="text-sm text-gray-600 mt-1">{prize.description}</p>
                  )}
                  {prize.image && (
                    <div className="mt-2">
                      <img
                        src={prize.image}
                        alt={prize.name}
                        className="h-12 w-12 object-cover rounded border"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-sm px-2 py-1 rounded ${
                      prize.remainingQuota > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {prize.remainingQuota}/{prize.quota} Tersisa
                    </span>
                  </div>
                </div>
                
                { (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(prize);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this prize?')) {
                          onDeletePrize(prize.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {prizes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No prizes added yet</p>
            <p className="text-sm">Add prizes to start organizing your doorprize event</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeManager;