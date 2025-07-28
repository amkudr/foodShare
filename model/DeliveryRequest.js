const mongoose = require('mongoose');

const deliveryRequestSchema = new mongoose.Schema({
    // Reference to the food item being delivered
    foodItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodItem',
        required: true
    },

    // Food pickup location (from food item)
    pickupLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },

    pickupAddress: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // Delivery destination
    deliveryLocation: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },

    deliveryAddress: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    // Requester information
    requesterName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    requesterContact: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    // Optional delivery details
    deliveryNotes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },

    preferredDeliveryTime: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
    },

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },

    // Helper information (when someone accepts the request)
    helperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // For future user system
        default: null
    },

    helperName: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
    },

    helperContact: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    acceptedAt: {
        type: Date,
        default: null
    },

    completedAt: {
        type: Date,
        default: null
    }
});

// Create geospatial indexes
deliveryRequestSchema.index({ pickupLocation: '2dsphere' });
deliveryRequestSchema.index({ deliveryLocation: '2dsphere' });

// Index for efficient querying
deliveryRequestSchema.index({ status: 1, createdAt: -1 });
deliveryRequestSchema.index({ foodItemId: 1 });

// Calculate total distance for the delivery
deliveryRequestSchema.methods.getTotalDistance = function() {
    const R = 6371; // Earth's radius in km
    const lat1 = this.pickupLocation.coordinates[1];
    const lon1 = this.pickupLocation.coordinates[0];
    const lat2 = this.deliveryLocation.coordinates[1];
    const lon2 = this.deliveryLocation.coordinates[0];
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
};

// Pre-save middleware to update timestamps
deliveryRequestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const DeliveryRequest = mongoose.model('DeliveryRequest', deliveryRequestSchema);
module.exports = DeliveryRequest;