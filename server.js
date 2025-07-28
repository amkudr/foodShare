const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectMongoDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const FoodItem = require('./model/FoodItem');
const DeliveryRequest = require('./model/DeliveryRequest');

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
        const { name, location, contact, description, latitude, longitude } = req.body;

        // Validation - handle both formats (coordinates array or separate lat/lng)
        let coordinates;
        if (location && location.coordinates && Array.isArray(location.coordinates)) {
            coordinates = location.coordinates;
        } else if (latitude !== undefined && longitude !== undefined) {
            coordinates = [longitude, latitude]; // GeoJSON format: [lng, lat]
        } else {
            return res.status(400).json({
                error: 'Missing coordinates: provide either location.coordinates or latitude/longitude'
            });
        }

        if (!name || !contact || coordinates.length !== 2) {
            return res.status(400).json({
                error: 'Missing required fields: name, contact, and valid coordinates are required'
            });
        }

        // Create new food item
        const foodItem = new FoodItem({
            name: name.trim(),
            location: {
                type: 'Point',
                coordinates: coordinates
            },
            address: location || '', // Use location string as address if provided
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
        const { name, location, contact, description, latitude, longitude } = req.body;

        // Validation - handle both formats
        let coordinates;
        if (location && location.coordinates && Array.isArray(location.coordinates)) {
            coordinates = location.coordinates;
        } else if (latitude !== undefined && longitude !== undefined) {
            coordinates = [longitude, latitude]; // GeoJSON format: [lng, lat]
        } else {
            return res.status(400).json({
                error: 'Missing coordinates: provide either location.coordinates or latitude/longitude'
            });
        }

        if (!name || !contact || coordinates.length !== 2) {
            return res.status(400).json({
                error: 'Missing required fields: name, contact, and valid coordinates are required'
            });
        }

        const updatedFoodItem = await FoodItem.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                location: {
                    type: 'Point',
                    coordinates: coordinates
                },
                address: location || '',
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

// DELIVERY REQUEST ROUTES

// Get all delivery requests with optional filtering
app.get('/api/delivery-requests', async (req, res) => {
    try {
        const { status, lat, lng, maxDistance } = req.query;
        let query = {};
        
        // Filter by status if provided
        if (status && status !== 'all') {
            query.status = status;
        } else {
            // By default, don't show completed or cancelled requests
            query.status = { $in: ['pending', 'accepted', 'in_progress'] };
        }
        
        let deliveryRequests;
        
        // If location parameters are provided, add geospatial query for pickup location
        if (lat && lng && maxDistance) {
            query.pickupLocation = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
                }
            };
        }
        
        deliveryRequests = await DeliveryRequest.find(query)
            .populate('foodItemId', 'name description contact') // Populate food item details
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json(deliveryRequests);
    } catch (error) {
        console.error('Error fetching delivery requests:', error);
        res.status(500).json({ 
            error: 'Failed to fetch delivery requests',
            message: error.message 
        });
    }
});

// Get single delivery request by ID
app.get('/api/delivery-requests/:id', async (req, res) => {
    try {
        const deliveryRequest = await DeliveryRequest.findById(req.params.id)
            .populate('foodItemId', 'name description contact address');
        
        if (!deliveryRequest) {
            return res.status(404).json({ error: 'Delivery request not found' });
        }
        
        res.json(deliveryRequest);
    } catch (error) {
        console.error('Error fetching delivery request:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid delivery request ID' });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch delivery request',
            message: error.message 
        });
    }
});

// Create new delivery request
app.post('/api/delivery-requests', async (req, res) => {
    try {
        const { 
            foodItemId, 
            pickupAddress, 
            pickupLatitude, 
            pickupLongitude,
            deliveryAddress, 
            deliveryLatitude, 
            deliveryLongitude,
            requesterName,
            requesterContact,
            deliveryNotes,
            preferredDeliveryTime
        } = req.body;

        // Validation
        if (!foodItemId || !pickupAddress || !deliveryAddress || !requesterName || !requesterContact) {
            return res.status(400).json({
                error: 'Missing required fields: foodItemId, pickupAddress, deliveryAddress, requesterName, requesterContact'
            });
        }

        // Validate coordinates
        if (isNaN(pickupLatitude) || isNaN(pickupLongitude) || isNaN(deliveryLatitude) || isNaN(deliveryLongitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates provided'
            });
        }

        // Check if food item exists
        const foodItem = await FoodItem.findById(foodItemId);
        if (!foodItem) {
            return res.status(404).json({
                error: 'Food item not found'
            });
        }

        // Validate coordinate ranges
        if (pickupLatitude < -90 || pickupLatitude > 90 || pickupLongitude < -180 || pickupLongitude > 180 ||
            deliveryLatitude < -90 || deliveryLatitude > 90 || deliveryLongitude < -180 || deliveryLongitude > 180) {
            return res.status(400).json({
                error: 'Coordinates must be within valid ranges'
            });
        }

        // Create new delivery request
        const deliveryRequest = new DeliveryRequest({
            foodItemId,
            pickupLocation: {
                type: 'Point',
                coordinates: [pickupLongitude, pickupLatitude]
            },
            pickupAddress: pickupAddress.trim(),
            deliveryLocation: {
                type: 'Point',
                coordinates: [deliveryLongitude, deliveryLatitude]
            },
            deliveryAddress: deliveryAddress.trim(),
            requesterName: requesterName.trim(),
            requesterContact: requesterContact.trim(),
            deliveryNotes: deliveryNotes ? deliveryNotes.trim() : '',
            preferredDeliveryTime: preferredDeliveryTime ? preferredDeliveryTime.trim() : ''
        });

        const savedDeliveryRequest = await deliveryRequest.save();
        
        // Populate the food item details for response
        const populatedRequest = await DeliveryRequest.findById(savedDeliveryRequest._id)
            .populate('foodItemId', 'name description contact address');

        console.log('✅ New delivery request created:', {
            id: savedDeliveryRequest._id,
            foodItem: foodItem.name,
            requester: savedDeliveryRequest.requesterName
        });
        
        res.status(201).json(populatedRequest);

    } catch (error) {
        console.error('Error creating delivery request:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                details: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to create delivery request',
            message: error.message
        });
    }
});

// Accept delivery request (helper volunteers)
app.put('/api/delivery-requests/:id/accept', async (req, res) => {
    try {
        const { helperName, helperContact } = req.body;

        if (!helperName || !helperContact) {
            return res.status(400).json({
                error: 'Helper name and contact are required'
            });
        }

        const deliveryRequest = await DeliveryRequest.findById(req.params.id);
        
        if (!deliveryRequest) {
            return res.status(404).json({ error: 'Delivery request not found' });
        }

        if (deliveryRequest.status !== 'pending') {
            return res.status(400).json({ error: 'This delivery request is no longer available' });
        }

        deliveryRequest.status = 'accepted';
        deliveryRequest.helperName = helperName.trim();
        deliveryRequest.helperContact = helperContact.trim();
        deliveryRequest.acceptedAt = new Date();

        const updatedRequest = await deliveryRequest.save();
        
        console.log('✅ Delivery request accepted:', {
            id: updatedRequest._id,
            helper: updatedRequest.helperName
        });
        
        res.json(updatedRequest);

    } catch (error) {
        console.error('Error accepting delivery request:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid delivery request ID' });
        }
        
        res.status(500).json({
            error: 'Failed to accept delivery request',
            message: error.message
        });
    }
});

// Update delivery request status
app.put('/api/delivery-requests/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const deliveryRequest = await DeliveryRequest.findById(req.params.id);
        
        if (!deliveryRequest) {
            return res.status(404).json({ error: 'Delivery request not found' });
        }

        deliveryRequest.status = status;
        
        if (status === 'completed') {
            deliveryRequest.completedAt = new Date();
        }

        const updatedRequest = await deliveryRequest.save();
        
        console.log('✅ Delivery request status updated:', {
            id: updatedRequest._id,
            status: updatedRequest.status
        });
        
        res.json(updatedRequest);

    } catch (error) {
        console.error('Error updating delivery request status:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid delivery request ID' });
        }
        
        res.status(500).json({
            error: 'Failed to update delivery request status',
            message: error.message
        });
    }
});

// Delete delivery request
app.delete('/api/delivery-requests/:id', async (req, res) => {
    try {
        const deletedRequest = await DeliveryRequest.findByIdAndDelete(req.params.id);
        
        if (!deletedRequest) {
            return res.status(404).json({ error: 'Delivery request not found' });
        }
        
        console.log('✅ Delivery request deleted:', deletedRequest._id);
        res.json({ 
            message: 'Delivery request deleted successfully',
            deletedRequest: {
                id: deletedRequest._id,
                requesterName: deletedRequest.requesterName
            }
        });
        
    } catch (error) {
        console.error('Error deleting delivery request:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid delivery request ID' });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete delivery request',
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