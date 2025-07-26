const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectMongoDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const FoodItem = require('./model/FoodItem');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
connectMongoDB();

// Routes

// Get all food items
app.get('/api/food-items', async (req, res) => {
    try {
        const foodItems = await FoodItem.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(50); // Limit to 50 items
        
        res.json(foodItems);
    } catch (error) {
        console.error('Error fetching food items:', error);
        res.status(500).json({ 
            error: 'Failed to fetch food items',
            message: error.message 
        });
    }
});

// Get single food item by ID
app.get('/api/food-items/:id', async (req, res) => {
    try {
        const foodItem = await FoodItem.findById(req.params.id);
        
        if (!foodItem) {
            return res.status(404).json({ error: 'Food item not found' });
        }
        
        res.json(foodItem);
    } catch (error) {
        console.error('Error fetching food item:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid food item ID' });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch food item',
            message: error.message 
        });
    }
});

// Create new food item
app.post('/api/food-items', async (req, res) => {
    try {
        const { name, location, contact, description } = req.body;
        
        // Validation
        if (!name || !location || !contact) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, location, and contact are required' 
            });
        }
        
        // Create new food item
        const foodItem = new FoodItem({
            name: name.trim(),
            location: location.trim(),
            contact: contact.trim(),
            description: description ? description.trim() : ''
        });
        
        const savedFoodItem = await foodItem.save();
        
        console.log('✅ New food item created:', savedFoodItem.name);
        res.status(201).json(savedFoodItem);
        
    } catch (error) {
        console.error('Error creating food item:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                details: error.errors 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create food item',
            message: error.message 
        });
    }
});

// Update food item
app.put('/api/food-items/:id', async (req, res) => {
    try {
        const { name, location, contact, description } = req.body;
        
        // Validation
        if (!name || !location || !contact) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, location, and contact are required' 
            });
        }
        
        const updatedFoodItem = await FoodItem.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                location: location.trim(),
                contact: contact.trim(),
                description: description ? description.trim() : '',
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedFoodItem) {
            return res.status(404).json({ error: 'Food item not found' });
        }
        
        console.log('✅ Food item updated:', updatedFoodItem.name);
        res.json(updatedFoodItem);
        
    } catch (error) {
        console.error('Error updating food item:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid food item ID' });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error',
                details: error.errors 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to update food item',
            message: error.message 
        });
    }
});

// Delete food item
app.delete('/api/food-items/:id', async (req, res) => {
    try {
        const deletedFoodItem = await FoodItem.findByIdAndDelete(req.params.id);
        
        if (!deletedFoodItem) {
            return res.status(404).json({ error: 'Food item not found' });
        }
        
        console.log('✅ Food item deleted:', deletedFoodItem.name);
        res.json({ message: 'Food item deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting food item:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid food item ID' });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete food item',
            message: error.message 
        });
    }
});

// Serve frontend files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
});