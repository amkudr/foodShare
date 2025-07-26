const mongoose = require('mongoose');
const foodItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
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

const FoodItem = mongoose.model('FoodItem', foodItemSchema);
module.exports = FoodItem;