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

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

foodItemSchema.index({ location: '2dsphere' });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
module.exports = FoodItem;
