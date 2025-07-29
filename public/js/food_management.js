// Food Management Functions

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

// Fetch food item by ID
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