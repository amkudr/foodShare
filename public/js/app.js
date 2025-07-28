// API base URL - change this to your server URL
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('FoodShare app initialized! 🍽️');
    loadFoodItems();
    // Try to get user location automatically
    getUserLocation();
    
    // Set up radius filter event listener
    const radiusSelect = document.getElementById('searchRadius');
    if (radiusSelect) {
        radiusSelect.addEventListener('change', filterByRadius);
    }
});
// Global variable to store all food items
let allFoodItems = [];

// Load food items from server
async function loadFoodItems() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/food-items`);
        
        if (!response.ok) {
            throw new Error('Failed to load food items');
        }
        
        const foodItems = await response.json();
        allFoodItems = foodItems; // Store all items globally
        displayFoodItems(foodItems);
        
    } catch (error) {
        console.error('Error loading food items:', error);
        showAlert('Failed to load food items. Please try again later.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display food items in the grid
function displayFoodItems(foodItems) {
    const foodGrid = document.getElementById('foodGrid');
    foodGrid.innerHTML = '';
    
    if (foodItems.length === 0) {
        foodGrid.innerHTML = '<p class="no-items">No food items found within the selected radius. Try increasing the search radius.</p>';
        return;
    }
    
    // Sort by distance if user location is available
    let sortedItems = [...foodItems];
    if (userLocation) {
        sortedItems.sort((a, b) => {
            if (!a.location?.coordinates || !b.location?.coordinates) return 0;
            
            const distA = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                a.location.coordinates[1], a.location.coordinates[0]
            );
            const distB = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                b.location.coordinates[1], b.location.coordinates[0]
            );
            return distA - distB;
        });
    }
    
    sortedItems.forEach(food => {
        const foodElement = createFoodElement(food, true); // true = show delivery button
        foodGrid.appendChild(foodElement);
    });
}
// Filter food items by radius
function filterByRadius() {
    if (!userLocation || allFoodItems.length === 0) {
        // If no location or no items, show all
        displayFoodItems(allFoodItems);
        return;
    }
    
    const radiusSelect = document.getElementById('searchRadius');
    const selectedRadius = radiusSelect.value;
    
    if (selectedRadius === 'all') {
        displayFoodItems(allFoodItems);
        updateResultCount(allFoodItems.length, 'all');
        return;
    }
    
    const radius = parseFloat(selectedRadius);
    
    // Filter items within radius
    const filteredItems = allFoodItems.filter(food => {
        if (!food.location || !food.location.coordinates) return false;
        
        const distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            food.location.coordinates[1], food.location.coordinates[0]
        );
        
        return distance <= radius;
    });
    
    displayFoodItems(filteredItems);
    updateResultCount(filteredItems.length, radius);
}

// Update result count display
function updateResultCount(count, radius) {
    const resultCountEl = document.getElementById('resultCount');
    
    if (radius === 'all') {
        resultCountEl.textContent = `Found ${count} items`;
    } else {
        resultCountEl.textContent = `Found ${count} items within ${radius}km`;
    }
    
    // Style the result count
    resultCountEl.style.color = count > 0 ? '#28a745' : '#dc3545';
    resultCountEl.style.fontWeight = 'bold';
    resultCountEl.style.marginLeft = '1rem';
}

// Create HTML element for a food item
function createFoodElement(food, showDeliveryBtn = true) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food-item';
    foodElement.setAttribute('data-id', food._id);

    const timeAgo = getTimeAgo(new Date(food.createdAt));

    // Use address if available, otherwise show coordinates
    const locationText = food.address || `${food.location.coordinates[1]}, ${food.location.coordinates[0]}`;

    // Calculate distance if user location is available
    let distanceHtml = '';
    if (userLocation && food.location && food.location.coordinates) {
        const distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            food.location.coordinates[1], food.location.coordinates[0]
        );
        distanceHtml = `<span class="food-distance">${distance.toFixed(1)} km away</span> • `;
    }

    // Show delivery button only on find page
    const deliveryBtnHtml = showDeliveryBtn ?
        '<button class="delivery-btn" onclick="requestDelivery(\'' + food._id + '\')">🚚 Request Delivery</button>' : '';

    foodElement.innerHTML = `
        <h3>${escapeHtml(food.name)}</h3>
        <div class="food-meta">📍 ${escapeHtml(locationText)} • ${distanceHtml}${timeAgo}</div>
        <div class="food-description">${escapeHtml(food.description)}</div>
        <div class="food-actions">
            <button class="contact-btn" onclick="contactOwner('${escapeHtml(food.contact)}')">Contact</button>
            ${deliveryBtnHtml}
            <button class="delete-btn" onclick="deleteFood('${food._id}')">Delete</button>
        </div>
    `;

    return foodElement;
}


// Toggle add food form visibility
function toggleAddForm() {
    const modal = document.getElementById("addFoodModal");
    if (modal.style.display === "block") {
        modal.style.display = "none";
        // Clear form when closing
        document.querySelector('#addFoodModal form').reset();
        clearAlert();
    } else {
        modal.style.display = "block";
    }
}

// Close the modal when clicking outside of it
window.onclick = function (event) {
    const modal = document.getElementById("addFoodModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// Add new food item
async function addFood(event) {
    event.preventDefault();

    try {
        // Get form data
        const foodData = {
            name: document.getElementById('foodName').value.trim(),
            location: document.getElementById('location').value.trim(),
            contact: document.getElementById('contact').value.trim(),
            description: document.getElementById('description').value.trim(),
            latitude: parseFloat(document.getElementById('latitude').value),
            longitude: parseFloat(document.getElementById('longitude').value)
        };

        // Validate form data
        if (!foodData.name || !foodData.location || !foodData.contact || isNaN(foodData.latitude) || isNaN(foodData.longitude)) {
            showAlert('Please fill in all required fields including coordinates.', 'error');
            return;
        }

        // Send to server
        const response = await fetch(`${API_BASE_URL}/food-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(foodData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add food item');
        }

        const newFood = await response.json();

        // Reload all food items to ensure proper display
        await loadFoodItems();

        // Reset form and hide modal
        event.target.reset();
        toggleAddForm();

        // Show success message
        showAlert('Food item shared successfully! 🎉', 'success');

    } catch (error) {
        console.error('Error adding food:', error);
        showAlert(error.message || 'Failed to share food item. Please try again.', 'error');
    }
}

// Delete food item
async function deleteFood(foodId) {
    if (!confirm('Are you sure you want to delete this food item?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/food-items/${foodId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete food item');
        }

        // Remove from display
        const foodElement = document.querySelector(`[data-id="${foodId}"]`);
        if (foodElement) {
            foodElement.remove();
        }

        showAlert('Food item deleted successfully.', 'success');

    } catch (error) {
        console.error('Error deleting food:', error);
        showAlert('Failed to delete food item. Please try again.', 'error');
    }
}

// Contact food owner
function contactOwner(contact) {
    // In a real app, this might open a messaging system
    // For demo, we'll show contact info
    alert(`Contact the food sharer at: ${contact}`);
}

// Show/hide loading indicator
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
            loading.style.display = 'block';
        } else {
            loading.classList.add('hidden');
            loading.style.display = 'none';
        }
    }
}

// Show alert message
function showAlert(message, type = 'success') {
    // Remove existing alerts
    clearAlert();

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
        padding: 10px 20px;
        margin: 10px 0;
        border-radius: 5px;
        text-align: center;
        ${type === 'success' ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
    `;

    // Insert after hero section
    const hero = document.querySelector('.hero');
    hero.parentNode.insertBefore(alertDiv, hero.nextSibling);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        clearAlert();
    }, 5000);
}

// Clear alert messages
function clearAlert() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => alert.remove());
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));

    if (diffInMinutes < 1) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global variables for user location
let userLocation = null;

// Page navigation function
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId + 'Page').classList.add('active');

    // Add active class to clicked nav link
    event.target.classList.add('active');

    // Load appropriate content
    if (pageId === 'find') {
        loadFoodItems();
    } else if (pageId === 'share') {
        loadSharedFoodItems();
    }
}

// Get user's current location
function getUserLocation() {
    const statusEl = document.getElementById('locationStatus');
    const btnEl = document.getElementById('getLocationBtn');
    const coordsEl = document.getElementById('userCoords');
    
    if (!navigator.geolocation) {
        statusEl.textContent = '❌ Geolocation is not supported';
        return;
    }
    
    statusEl.textContent = '📍 Getting location...';
    btnEl.disabled = true;
    btnEl.textContent = 'Getting Location...';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            statusEl.textContent = '✅ Location detected';
            btnEl.textContent = 'Update Location';
            btnEl.disabled = false;
            
            // Show coordinates
            document.getElementById('coordsDisplay').textContent = 
                `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`;
            coordsEl.style.display = 'inline-block';
            
            // Apply current radius filter
            filterByRadius();
            
            console.log('User location obtained:', userLocation);
        },
        function(error) {
            console.error('Error getting location:', error);
            statusEl.textContent = '❌ Location access denied';
            btnEl.disabled = false;
            btnEl.textContent = 'Get My Location';
            
            // Hide coordinates
            coordsEl.style.display = 'none';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    statusEl.textContent = '❌ Location access denied';
                    break;
                case error.POSITION_UNAVAILABLE:
                    statusEl.textContent = '❌ Location unavailable';
                    break;
                case error.TIMEOUT:
                    statusEl.textContent = '❌ Location timeout';
                    break;
            }
            
            // Show all items when location is not available
            displayFoodItems(allFoodItems);
            updateResultCount(allFoodItems.length, 'all');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}


// Use current location for the add food form
function useMyLocationForForm() {
    if (userLocation) {
        document.getElementById('latitude').value = userLocation.latitude;
        document.getElementById('longitude').value = userLocation.longitude;
        showAlert('Location filled in successfully! 📍', 'success');
    } else {
        showAlert('Please allow location access first', 'error');
        getUserLocation();
    }
}

// Load shared food items for share page
async function loadSharedFoodItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/food-items`);

        if (!response.ok) {
            throw new Error('Failed to load shared food items');
        }

        const foodItems = await response.json();
        displaySharedFoodItems(foodItems);

    } catch (error) {
        console.error('Error loading shared food items:', error);
        showAlert('Failed to load shared food items. Please try again later.', 'error');
    }
}

// Display shared food items in the share page
function displaySharedFoodItems(foodItems) {
    const foodGrid = document.getElementById('sharedFoodGrid');

    if (!foodGrid) return; // Guard clause if element doesn't exist

    foodGrid.innerHTML = '';

    if (foodItems.length === 0) {
        foodGrid.innerHTML = '<p class="no-items">No shared food items yet. Share some food to see it here!</p>';
        return;
    }

    // Show latest 10 items
    const recentItems = foodItems.slice(0, 10);

    recentItems.forEach(food => {
        const foodElement = createFoodElement(food);
        foodGrid.appendChild(foodElement);
    });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}