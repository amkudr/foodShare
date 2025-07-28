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
    
    // REMOVE the backup event listeners since onclick handlers already work
    // The duplicate event listeners are causing double execution
    
    // Debug: Check if delivery elements exist after DOM is loaded
    setTimeout(() => {
        const deliveryTab = document.getElementById('helpDeliverTab');
        const requestsGrid = document.getElementById('deliveryRequestsGrid');
        console.log('Delivery elements check:', {
            deliveryTab: !!deliveryTab,
            requestsGrid: !!requestsGrid,
            requestTab: !!document.getElementById('requestDeliverTab')
        });
    }, 1000);
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
    console.log('Switching to page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('Successfully activated page:', pageId + 'Page');
    } else {
        console.error('Target page not found:', pageId + 'Page');
        return;
    }
    
    // Add active class to clicked nav link - find it more reliably
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.onclick && link.onclick.toString().includes(`showPage('${pageId}')`)) {
            link.classList.add('active');
        }
    });
    
    // Load appropriate content with proper delays
    if (pageId === 'find') {
        loadFoodItems();
    } else if (pageId === 'share') {
        if (typeof loadSharedFoodItems === 'function') {
            loadSharedFoodItems();
        }
    } else if (pageId === 'delivery') {
        // Initialize delivery page with a delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Initializing delivery page...');
            showDeliveryTab('request');
        }, 100);
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

// Global variables for delivery system
let helperLocation = null;
let allDeliveryRequests = [];
let selectedFoodItem = null;

// Delivery tab navigation
function showDeliveryTab(tabName) {
    console.log('Switching to delivery tab:', tabName);
    
    setTimeout(() => {
        const deliveryPage = document.getElementById('deliveryPage');
        if (!deliveryPage || !deliveryPage.classList.contains('active')) {
            console.error('Delivery page not found or not active');
            return;
        }
        
        // Hide all delivery tabs
        document.querySelectorAll('.delivery-tab').forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Show selected tab - try both possible IDs
        let targetTab = document.getElementById(tabName + 'DeliveryTab'); // Old format
        if (!targetTab) {
            targetTab = document.getElementById(tabName + 'DeliverTab'); // New format
        }
        
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('Successfully activated tab:', targetTab.id);
        } else {
            console.error('Target tab not found for:', tabName);
            console.log('Available tabs:', Array.from(document.querySelectorAll('.delivery-tab')).map(tab => tab.id));
            return;
        }
        
        // Activate the correct button
        const tabButtons = document.querySelectorAll('.tab-btn');
        const clickedButton = Array.from(tabButtons).find(btn => {
            const buttonText = btn.textContent.trim();
            return (tabName === 'request' && buttonText.includes('Request')) ||
                   (tabName === 'help' && buttonText.includes('Help'));
        });
        
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
        
        // Load content
        if (tabName === 'request') {
            loadFoodForDelivery();
        } else if (tabName === 'help') {
            loadDeliveryRequests();
            getHelperLocation();
        }
    }, 50);
}
// Load food items available for delivery request
async function loadFoodForDelivery() {
    try {
        const response = await fetch(`${API_BASE_URL}/food-items`);
        
        if (!response.ok) {
            throw new Error('Failed to load food items');
        }
        
        const foodItems = await response.json();
        displayFoodForDelivery(foodItems);
        
    } catch (error) {
        console.error('Error loading food for delivery:', error);
        showAlert('Failed to load food items for delivery. Please try again later.', 'error');
    }
}

// Display food items for delivery request
function displayFoodForDelivery(foodItems) {
    const foodGrid = document.getElementById('deliveryFoodGrid');
    foodGrid.innerHTML = '';
    
    if (foodItems.length === 0) {
        foodGrid.innerHTML = '<p class="no-items">No food items available for delivery yet.</p>';
        return;
    }
    
    foodItems.forEach(food => {
        const foodElement = createDeliveryFoodElement(food);
        foodGrid.appendChild(foodElement);
    });
}

// Create food element for delivery request
function createDeliveryFoodElement(food) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food-item delivery-food-item';
    foodElement.setAttribute('data-id', food._id);
    
    const timeAgo = getTimeAgo(new Date(food.createdAt));
    const locationText = food.address || `${food.location.coordinates[1]}, ${food.location.coordinates[0]}`;
    
    foodElement.innerHTML = `
        <h3>${escapeHtml(food.name)}</h3>
        <div class="food-meta">📍 ${escapeHtml(locationText)} • ${timeAgo}</div>
        <div class="food-description">${escapeHtml(food.description)}</div>
        <div class="food-contact">
            <strong>Food Sharer:</strong> ${escapeHtml(food.contact)}
        </div>
        <div class="food-actions">
            <button class="cta-button" onclick="requestDeliveryForFood('${food._id}')">
                📝 Request Delivery
            </button>
        </div>
    `;
    
    return foodElement;
}

// Request delivery for specific food item
function requestDeliveryForFood(foodId) {
    console.log('requestDeliveryForFood called with foodId:', foodId);
    
    // Find the food item from allFoodItems
    let foodItem = null;
    
    // Try to find in allFoodItems first
    if (allFoodItems && allFoodItems.length > 0) {
        foodItem = allFoodItems.find(item => item._id === foodId);
        console.log('Found food item in allFoodItems:', !!foodItem);
    } else {
        console.log('allFoodItems is empty or undefined:', allFoodItems);
    }
    
    // If not found, try to fetch it directly
    if (!foodItem) {
        console.error('Food item not found in allFoodItems for ID:', foodId);
        fetchFoodItemById(foodId);
        return;
    }
    
    selectedFoodItem = foodItem;
    
    // Check if modal elements exist
    const selectedFoodId = document.getElementById('selectedFoodId');
    const pickupAddress = document.getElementById('pickupAddress');
    const pickupLatitude = document.getElementById('pickupLatitude');
    const pickupLongitude = document.getElementById('pickupLongitude');
    const selectedFoodInfo = document.getElementById('selectedFoodInfo');
    const modal = document.getElementById('requestDeliveryModal');
    
    if (!selectedFoodId || !pickupAddress || !pickupLatitude || !pickupLongitude || !selectedFoodInfo || !modal) {
        console.error('Modal elements not found:', {
            selectedFoodId: !!selectedFoodId,
            pickupAddress: !!pickupAddress,
            pickupLatitude: !!pickupLatitude,
            pickupLongitude: !!pickupLongitude,
            selectedFoodInfo: !!selectedFoodInfo,
            modal: !!modal
        });
        showAlert('Delivery request form not available', 'error');
        return;
    }
    
    // Populate the modal with food information
    selectedFoodId.value = foodId;
    pickupAddress.value = foodItem.address || 'Address not specified';
    pickupLatitude.value = foodItem.location.coordinates[1];
    pickupLongitude.value = foodItem.location.coordinates[0];
    
    // Display selected food info
    selectedFoodInfo.innerHTML = `
        <div class="selected-food-card">
            <h4>${escapeHtml(foodItem.name)}</h4>
            <p><strong>Description:</strong> ${escapeHtml(foodItem.description || 'No description')}</p>
            <p><strong>Food Sharer Contact:</strong> ${escapeHtml(foodItem.contact)}</p>
            <p><strong>Pickup Location:</strong> ${escapeHtml(foodItem.address || 'See coordinates below')}</p>
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    console.log('Modal should now be visible');
}


// Use current location for delivery address
function useMyLocationForDelivery() {
    if (userLocation) {
        document.getElementById('deliveryLatitude').value = userLocation.latitude;
        document.getElementById('deliveryLongitude').value = userLocation.longitude;
        showAlert('Your location filled in successfully! 📍', 'success');
    } else {
        showAlert('Please allow location access first', 'error');
        getUserLocation();
    }
}

// Submit delivery request
async function submitDeliveryRequest(event) {
    event.preventDefault();

    try {
        const deliveryData = {
            foodItemId: document.getElementById('selectedFoodId').value,
            pickupAddress: document.getElementById('pickupAddress').value.trim(),
            pickupLatitude: parseFloat(document.getElementById('pickupLatitude').value),
            pickupLongitude: parseFloat(document.getElementById('pickupLongitude').value),
            deliveryAddress: document.getElementById('deliveryAddress').value.trim(),
            deliveryLatitude: parseFloat(document.getElementById('deliveryLatitude').value),
            deliveryLongitude: parseFloat(document.getElementById('deliveryLongitude').value),
            requesterName: document.getElementById('requesterName').value.trim(),
            requesterContact: document.getElementById('requesterContact').value.trim(),
            deliveryNotes: document.getElementById('deliveryNotes').value.trim(),
            preferredDeliveryTime: document.getElementById('preferredDeliveryTime').value.trim()
        };

        console.log('Submitting delivery request:', deliveryData);

        // Validation
        if (!deliveryData.deliveryAddress || !deliveryData.requesterName || !deliveryData.requesterContact || 
            isNaN(deliveryData.deliveryLatitude) || isNaN(deliveryData.deliveryLongitude)) {
            showAlert('Please fill in all required fields including delivery coordinates.', 'error');
            return;
        }

        // Validate coordinate ranges
        if (deliveryData.deliveryLatitude < -90 || deliveryData.deliveryLatitude > 90 ||
            deliveryData.deliveryLongitude < -180 || deliveryData.deliveryLongitude > 180) {
            showAlert('Delivery coordinates must be within valid ranges', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/delivery-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deliveryData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error(errorData.error || 'Failed to submit delivery request');
        }

        const newRequest = await response.json();
        console.log('Delivery request created:', newRequest);

        // Reset form and close modal
        event.target.reset();
        closeRequestDeliveryModal();

        // Show success message
        showAlert('Delivery request submitted successfully! 🚚 Community helpers will be notified.', 'success');

        // If we're on the help deliver tab, refresh the requests
        // CORRECTED: Use the right element ID from HTML
        const helpTab = document.getElementById('helpDeliverTab');
        if (helpTab && helpTab.classList.contains('active')) {
            console.log('Refreshing delivery requests on help tab');
            await loadDeliveryRequests();
        }

    } catch (error) {
        console.error('Error submitting delivery request:', error);
        showAlert(error.message || 'Failed to submit delivery request. Please try again.', 'error');
    }
}
// Close request delivery modal
function closeRequestDeliveryModal() {
    document.getElementById('requestDeliveryModal').style.display = 'none';
    document.querySelector('#requestDeliveryModal form').reset();
    selectedFoodItem = null;
}

// Get helper location for delivery assistance
function getHelperLocation() {
    const statusEl = document.getElementById('helperLocationStatus');
    const btnEl = document.getElementById('getHelperLocationBtn');
    const coordsEl = document.getElementById('helperCoords');
    
    if (!navigator.geolocation) {
        statusEl.textContent = '❌ Geolocation is not supported';
        return;
    }
    
    statusEl.textContent = '📍 Getting location...';
    btnEl.disabled = true;
    btnEl.textContent = 'Getting Location...';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            helperLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            statusEl.textContent = '✅ Location detected';
            btnEl.textContent = 'Update Location';
            btnEl.disabled = false;
            
            // Show coordinates
            document.getElementById('helperCoordsDisplay').textContent = 
                `${helperLocation.latitude.toFixed(6)}, ${helperLocation.longitude.toFixed(6)}`;
            coordsEl.style.display = 'inline-block';
            
            // Apply current filters
            filterDeliveryRequests();
            
            console.log('Helper location obtained:', helperLocation);
        },
        function(error) {
            console.error('Error getting helper location:', error);
            statusEl.textContent = '❌ Location access denied';
            btnEl.disabled = false;
            btnEl.textContent = 'Get My Location';
            
            // Hide coordinates
            coordsEl.style.display = 'none';
            
            // Show all requests when location is not available
            displayDeliveryRequests(allDeliveryRequests);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}

// Load delivery requests
async function loadDeliveryRequests() {
    try {
        console.log('Loading delivery requests...');
        
        // Check if element exists
        const requestsGrid = document.getElementById('deliveryRequestsGrid');
        if (!requestsGrid) {
            console.error('deliveryRequestsGrid element not found');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/delivery-requests`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to load delivery requests`);
        }
        
        const requests = await response.json();
        console.log('Loaded delivery requests:', requests.length, 'requests');
        console.log('First request:', requests[0]);
        
        allDeliveryRequests = requests;
        
        // Apply current filters
        filterDeliveryRequests();
        
    } catch (error) {
        console.error('Error loading delivery requests:', error);
        showAlert('Failed to load delivery requests. Please try again later.', 'error');
        
        // Show empty state
        const requestsGrid = document.getElementById('deliveryRequestsGrid');
        if (requestsGrid) {
            requestsGrid.innerHTML = '<p class="no-items">Failed to load delivery requests. Please try again later.</p>';
        }
    }
}

// Filter delivery requests by radius and status
function filterDeliveryRequests() {
    console.log('Filtering delivery requests, total:', allDeliveryRequests.length);
    
    if (allDeliveryRequests.length === 0) {
        displayDeliveryRequests([]);
        updateDeliveryResultCount(0, 'all', 'all');
        return;
    }
    
    const radiusSelect = document.getElementById('helperRadius');
    const statusSelect = document.getElementById('deliveryStatus');
    
    if (!radiusSelect || !statusSelect) {
        console.error('Filter elements not found:', {
            radiusSelect: !!radiusSelect,
            statusSelect: !!statusSelect
        });
        displayDeliveryRequests(allDeliveryRequests);
        return;
    }
    
    const selectedRadius = radiusSelect.value;
    const selectedStatus = statusSelect.value;
    
    console.log('Filter criteria:', { selectedRadius, selectedStatus });
    
    let filteredRequests = [...allDeliveryRequests];
    
    // Filter by status
    if (selectedStatus !== 'all') {
        filteredRequests = filteredRequests.filter(request => request.status === selectedStatus);
        console.log('After status filter:', filteredRequests.length);
    }
    
    // Filter by radius if helper location is available and radius is not 'all'
    if (helperLocation && selectedRadius !== 'all') {
        const radius = parseFloat(selectedRadius);
        filteredRequests = filteredRequests.filter(request => {
            if (!request.pickupLocation || !request.pickupLocation.coordinates) return false;
            
            const distance = calculateDistance(
                helperLocation.latitude, helperLocation.longitude,
                request.pickupLocation.coordinates[1], request.pickupLocation.coordinates[0]
            );
            
            return distance <= radius;
        });
        console.log('After radius filter:', filteredRequests.length);
    }
    
    displayDeliveryRequests(filteredRequests);
    updateDeliveryResultCount(filteredRequests.length, selectedRadius, selectedStatus);
}

// Update delivery result count
function updateDeliveryResultCount(count, radius, status) {
    const resultCountEl = document.getElementById('deliveryResultCount');
    
    if (!resultCountEl) {
        console.error('deliveryResultCount element not found');
        return;
    }
    
    let statusText = status === 'all' ? 'active' : status;
    let radiusText = radius === 'all' ? '' : ` within ${radius}km`;
    
    resultCountEl.textContent = `Found ${count} ${statusText} requests${radiusText}`;
    resultCountEl.style.color = count > 0 ? '#28a745' : '#dc3545';
    resultCountEl.style.fontWeight = 'bold';
    resultCountEl.style.marginLeft = '1rem';
}

// Display delivery requests
function displayDeliveryRequests(requests) {
    console.log('Displaying delivery requests:', requests.length);
    
    const requestsGrid = document.getElementById('deliveryRequestsGrid');
    if (!requestsGrid) {
        console.error('Delivery requests grid not found');
        return;
    }
    
    requestsGrid.innerHTML = '';
    
    if (requests.length === 0) {
        requestsGrid.innerHTML = '<p class="no-items">No delivery requests found matching your criteria.</p>';
        return;
    }
    
    // Sort by distance if helper location is available
    let sortedRequests = [...requests];
    if (helperLocation) {
        sortedRequests.sort((a, b) => {
            if (!a.pickupLocation?.coordinates || !b.pickupLocation?.coordinates) return 0;
            
            const distA = calculateDistance(
                helperLocation.latitude, helperLocation.longitude,
                a.pickupLocation.coordinates[1], a.pickupLocation.coordinates[0]
            );
            const distB = calculateDistance(
                helperLocation.latitude, helperLocation.longitude,
                b.pickupLocation.coordinates[1], b.pickupLocation.coordinates[0]
            );
            return distA - distB;
        });
    }
    
    sortedRequests.forEach((request, index) => {
        try {
            const requestElement = createDeliveryRequestElement(request);
            requestsGrid.appendChild(requestElement);
        } catch (error) {
            console.error(`Error creating element for request ${index}:`, error, request);
        }
    });
    
    console.log('Successfully displayed', sortedRequests.length, 'delivery requests');
}

// Create delivery request element
function createDeliveryRequestElement(request) {
    const requestElement = document.createElement('div');
    requestElement.className = 'delivery-request-item';
    requestElement.setAttribute('data-id', request._id);
    
    const timeAgo = getTimeAgo(new Date(request.createdAt));
    const statusClass = request.status.replace('_', '-');
    
    // Calculate distances
    let pickupDistance = '';
    let totalDistance = '';
    
    if (helperLocation && request.pickupLocation && request.pickupLocation.coordinates) {
        const distToPickup = calculateDistance(
            helperLocation.latitude, helperLocation.longitude,
            request.pickupLocation.coordinates[1], request.pickupLocation.coordinates[0]
        );
        pickupDistance = `<span class="distance-info">📍 ${distToPickup.toFixed(1)} km from you</span>`;
    }
    
    if (request.pickupLocation && request.deliveryLocation) {
        const deliveryDist = calculateDistance(
            request.pickupLocation.coordinates[1], request.pickupLocation.coordinates[0],
            request.deliveryLocation.coordinates[1], request.deliveryLocation.coordinates[0]
        );
        totalDistance = `<span class="delivery-distance">🚚 ${deliveryDist.toFixed(1)} km delivery</span>`;
    }
    
    // Get food item info
    const foodInfo = request.foodItemId ? {
        name: request.foodItemId.name || 'Unknown Food',
        description: request.foodItemId.description || '',
        contact: request.foodItemId.contact || 'Contact not available'
    } : {
        name: 'Food item deleted',
        description: '',
        contact: 'Contact not available'
    };
    
    const actionButton = request.status === 'pending' ? 
        `<button class="cta-button" onclick="showHelperContactModal('${request._id}')">🤝 Accept Request</button>` :
        `<button class="btn-secondary" disabled>Status: ${request.status.replace('_', ' ').toUpperCase()}</button>`;
    
    requestElement.innerHTML = `
        <div class="request-header">
            <h3>${escapeHtml(foodInfo.name)}</h3>
            <span class="status-badge status-${statusClass}">${request.status.replace('_', ' ')}</span>
        </div>
        
        <div class="request-meta">
            ${pickupDistance} • ${totalDistance} • ${timeAgo}
        </div>
        
        <div class="request-details">
            <div class="food-details">
                <p><strong>Food Description:</strong> ${escapeHtml(foodInfo.description)}</p>
                <p><strong>Food Sharer Contact:</strong> ${escapeHtml(foodInfo.contact)}</p>
            </div>
            
            <div class="location-details">
                <p><strong>Pickup:</strong> ${escapeHtml(request.pickupAddress)}</p>
                <p><strong>Delivery:</strong> ${escapeHtml(request.deliveryAddress)}</p>
            </div>
            
            <div class="requester-details">
                <p><strong>Requester:</strong> ${escapeHtml(request.requesterName)}</p>
                <p><strong>Contact:</strong> ${escapeHtml(request.requesterContact)}</p>
                ${request.preferredDeliveryTime ? `<p><strong>Preferred Time:</strong> ${escapeHtml(request.preferredDeliveryTime)}</p>` : ''}
                ${request.deliveryNotes ? `<p><strong>Notes:</strong> ${escapeHtml(request.deliveryNotes)}</p>` : ''}
            </div>
            
            ${request.helperName ? `
                <div class="helper-details">
                    <p><strong>Helper:</strong> ${escapeHtml(request.helperName)}</p>
                    <p><strong>Helper Contact:</strong> ${escapeHtml(request.helperContact)}</p>
                </div>
            ` : ''}
        </div>
        
        <div class="request-actions">
            ${actionButton}
        </div>
    `;
    
    return requestElement;
}

// Show helper contact modal
function showHelperContactModal(requestId) {
    const request = allDeliveryRequests.find(req => req._id === requestId);
    if (!request) {
        showAlert('Request not found', 'error');
        return;
    }
    
    // Set the selected request ID
    document.getElementById('selectedRequestId').value = requestId;
    
    // Display request info
    const requestInfo = document.getElementById('deliveryRequestInfo');
    const foodInfo = request.foodItemId || { name: 'Unknown Food', description: '', contact: 'N/A' };
    
    requestInfo.innerHTML = `
        <div class="request-summary">
            <h4>${escapeHtml(foodInfo.name)}</h4>
            <p><strong>Requester:</strong> ${escapeHtml(request.requesterName)}</p>
            <p><strong>Pickup:</strong> ${escapeHtml(request.pickupAddress)}</p>
            <p><strong>Delivery:</strong> ${escapeHtml(request.deliveryAddress)}</p>
            <p><strong>Food Sharer Contact:</strong> ${escapeHtml(foodInfo.contact)}</p>
            <p><strong>Requester Contact:</strong> ${escapeHtml(request.requesterContact)}</p>
        </div>
    `;
    
    // Show the modal
    document.getElementById('helperContactModal').style.display = 'block';
}

// Accept delivery request
async function acceptDeliveryRequest(event) {
    event.preventDefault();

    try {
        const requestId = document.getElementById('selectedRequestId').value;
        const helperData = {
            helperName: document.getElementById('helperName').value.trim(),
            helperContact: document.getElementById('helperContact').value.trim()
        };

        // Validation
        if (!helperData.helperName || !helperData.helperContact) {
            showAlert('Please fill in your name and contact information.', 'error');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/delivery-requests/${requestId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(helperData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to accept delivery request');
        }

        const updatedRequest = await response.json();

        // Reset form and close modal
        event.target.reset();
        closeHelperContactModal();

        // Reload delivery requests
        await loadDeliveryRequests();
        filterDeliveryRequests();

        // Show success message
        showAlert('Delivery request accepted! 🎉 Please contact both the food sharer and requester to coordinate.', 'success');

    } catch (error) {
        console.error('Error accepting delivery request:', error);
        showAlert(error.message || 'Failed to accept delivery request. Please try again.', 'error');
    }
}

// Close helper contact modal
function closeHelperContactModal() {
    document.getElementById('helperContactModal').style.display = 'none';
    document.querySelector('#helperContactModal form').reset();
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const requestModal = document.getElementById('requestDeliveryModal');
    const helperModal = document.getElementById('helperContactModal');
    
    if (event.target === requestModal) {
        closeRequestDeliveryModal();
    }
    
    if (event.target === helperModal) {
        closeHelperContactModal();
    }
});

function requestDelivery(foodId) {
    console.log('requestDelivery called with foodId:', foodId);
    // Show modal for delivery request
    requestDeliveryForFood(foodId);
}


async function fetchFoodItemById(foodId) {
    try {
        console.log('Fetching food item by ID:', foodId);
        const response = await fetch(`${API_BASE_URL}/food-items/${foodId}`);
        if (!response.ok) {
            throw new Error('Food item not found');
        }
        const foodItem = await response.json();
        console.log('Fetched food item:', foodItem);
        
        // Add to allFoodItems if not already there
        if (!allFoodItems.find(item => item._id === foodId)) {
            allFoodItems.push(foodItem);
        }
        
        // Now call the function again
        requestDeliveryForFood(foodId);
        
    } catch (error) {
        console.error('Error fetching food item:', error);
        showAlert('Food item not found', 'error');
    }
}
