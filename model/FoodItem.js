const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    // GeoJSON 
    location: {
        type: {
            type: String,
            enum: ['Point'], // GeoJSON type
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },

    address: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ''
    },

    contact: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },

    // Photo stored as base64 string
    photo: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                // Check if it's a valid base64 image or null/empty
                if (!v) return true;
                // Check if it starts with data:image/ and is valid base64
                return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(v);
            },
            message: 'Photo must be a valid base64 encoded image'
        }
    },

    // Photo metadata
    photoMetadata: {
        originalName: {
            type: String,
            default: null
        },
        size: {
            type: Number,
            default: null
        },
        mimeType: {
            type: String,
            default: null
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere index for geospatial queries
foodItemSchema.index({ location: '2dsphere' });

// Pre-save middleware to update updatedAt
foodItemSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Instance method to get photo URL or placeholder
foodItemSchema.methods.getPhotoUrl = function() {
    return this.photo || null;
};

// Static method to validate photo size (max 1MB)
foodItemSchema.statics.validatePhotoSize = function(base64String) {
    if (!base64String) return true;
    
    // Calculate size from base64 string
    const sizeInBytes = (base64String.length * 3) / 4;
    const maxSizeInBytes = 1024 * 1024; // 1MB
    
    return sizeInBytes <= maxSizeInBytes;
};

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
module.exports = FoodItem;