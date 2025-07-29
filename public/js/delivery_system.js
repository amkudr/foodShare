// Delivery System Functions

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
            if (typeof getHelperLocation === 'function') {
                getHelperLocation();
            }
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
        if (typeof showAlert === 'function') {
            showAlert('Failed to load food items for delivery. Please try again later.', 'error');
        }
    }
}

// Display food items for delivery request
function displayFoodForDelivery(foodItems) {
    const foodGrid = document.getElementById('deliveryFoodGrid');
    if (!foodGrid) return;
    
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
    
    const timeAgo = typeof getTimeAgo === 'function' ? getTimeAgo(new Date(food.createdAt)) : 'Recently';
    const locationText = food.address || `${food.location.coordinates[1]}, ${food.location.coordinates[0]}`;
    
    // Create photo HTML if photo exists
    const photoHtml = food.photo ? 
        `<div class="food-photo">
            <img src="${food.photo}" alt="${typeof escapeHtml === 'function' ? escapeHtml(food.name) : food.name}" class="food-image" loading="lazy">
        </div>` : '';
    
    foodElement.innerHTML = `
        ${photoHtml}
        <div class="food-content">
            <h3>${typeof escapeHtml === 'function' ? escapeHtml(food.name) : food.name}</h3>
            <div class="food-meta">📍 ${typeof escapeHtml === 'function' ? escapeHtml(locationText) : locationText} • ${timeAgo}</div>
            <div class="food-description">${typeof escapeHtml === 'function' ? escapeHtml(food.description) : food.description}</div>
            <div class="food-contact">
                <strong>Food Sharer:</strong> ${typeof escapeHtml === 'function' ? escapeHtml(food.contact) : food.contact}
            </div>
            <div class="food-actions">
                <button class="cta-button" onclick="requestDeliveryForFood('${food._id}')">
                    📝 Request Delivery
                </button>
            </div>
        </div>
    `;
    
    return foodElement;
}

// Request delivery function (called from delivery button)
function requestDelivery(foodId) {
    console.log('requestDelivery called with foodId:', foodId);
    requestDeliveryForFood(foodId);
}

// Request delivery for specific food item
function requestDeliveryForFood(foodId) {
    console.log('requestDeliveryForFood called with foodId:', foodId);
    
    // Find the food item from allFoodItems
    let foodItem = null;
    
    // Try to find in allFoodItems first
    if (typeof allFoodItems !== 'undefined' && allFoodItems && allFoodItems.length > 0) {
        foodItem = allFoodItems.find(item => item._id === foodId);
        console.log('Found food item in allFoodItems:', !!foodItem);
    } else {
        console.log('allFoodItems is empty or undefined:', typeof allFoodItems !== 'undefined' ? allFoodItems : 'undefined');
    }
    
    // If not found, try to fetch it directly
    if (!foodItem) {
        console.error('Food item not found in allFoodItems for ID:', foodId);
        if (typeof fetchFoodItemById === 'function') {
            fetchFoodItemById(foodId);
        } else {
            console.error('fetchFoodItemById function not available');
            if (typeof showAlert === 'function') {
                showAlert('Food item not found', 'error');
            }
        }
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
        if (typeof showAlert === 'function') {
            showAlert('Delivery request form not available', 'error');
        }
        return;
    }
    
    // Populate the modal with food information
    selectedFoodId.value = foodId;
    pickupAddress.value = foodItem.address || 'Address not specified';
    pickupLatitude.value = foodItem.location.coordinates[1];
    pickupLongitude.value = foodItem.location.coordinates[0];
    
    // Display selected food info
    const escapedName = typeof escapeHtml === 'function' ? escapeHtml(foodItem.name) : foodItem.name;
    const escapedDescription = typeof escapeHtml === 'function' ? escapeHtml(foodItem.description || 'No description') : (foodItem.description || 'No description');
    const escapedContact = typeof escapeHtml === 'function' ? escapeHtml(foodItem.contact) : foodItem.contact;
    const escapedAddress = typeof escapeHtml === 'function' ? escapeHtml(foodItem.address || 'See coordinates below') : (foodItem.address || 'See coordinates below');
    
    // Create photo HTML if photo exists
    const photoHtml = foodItem.photo ? 
        `<div class="selected-food-photo">
            <img src="${foodItem.photo}" alt="${escapedName}" class="selected-food-image" style="max-width: 150px; max-height: 150px; border-radius: 8px; margin-bottom: 10px;">
        </div>` : '';
    
    selectedFoodInfo.innerHTML = `
        <div class="selected-food-card">
            ${photoHtml}
            <h4>${escapedName}</h4>
            <p><strong>Description:</strong> ${escapedDescription}</p>
            <p><strong>Food Sharer Contact:</strong> ${escapedContact}</p>
            <p><strong>Pickup Location:</strong> ${escapedAddress}</p>
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    console.log('Modal should now be visible');
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
            if (typeof showAlert === 'function') {
                showAlert('Please fill in all required fields including delivery coordinates.', 'error');
            }
            return;
        }

        // Validate coordinate ranges
        if (deliveryData.deliveryLatitude < -90 || deliveryData.deliveryLatitude > 90 ||
            deliveryData.deliveryLongitude < -180 || deliveryData.deliveryLongitude > 180) {
            if (typeof showAlert === 'function') {
                showAlert('Delivery coordinates must be within valid ranges', 'error');
            }
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
        if (typeof showAlert === 'function') {
            showAlert('Delivery request submitted successfully! 🚚 Community helpers will be notified.', 'success');
        }

        // If we're on the help deliver tab, refresh the requests
        const helpTab = document.getElementById('helpDeliverTab');
        if (helpTab && helpTab.classList.contains('active')) {
            console.log('Refreshing delivery requests on help tab');
            await loadDeliveryRequests();
        }

    } catch (error) {
        console.error('Error submitting delivery request:', error);
        if (typeof showAlert === 'function') {
            showAlert(error.message || 'Failed to submit delivery request. Please try again.', 'error');
        }
    }
}

// Close request delivery modal
function closeRequestDeliveryModal() {
    const modal = document.getElementById('requestDeliveryModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.querySelector('#requestDeliveryModal form');
        if (form) {
            form.reset();
        }
    }
    selectedFoodItem = null;
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
        if (typeof showAlert === 'function') {
            showAlert('Failed to load delivery requests. Please try again later.', 'error');
        }
        
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
            
            const distance = typeof calculateDistance === 'function' ? calculateDistance(
                helperLocation.latitude, helperLocation.longitude,
                request.pickupLocation.coordinates[1], request.pickupLocation.coordinates[0]
            ) : 0;
            
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
    if (helperLocation && typeof calculateDistance === 'function') {
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
    
    const timeAgo = typeof getTimeAgo === 'function' ? getTimeAgo(new Date(request.createdAt)) : 'Recently';
    const statusClass = request.status.replace('_', '-');
    
    // Calculate distances
    let pickupDistance = '';
    let totalDistance = '';
    
    if (helperLocation && request.pickupLocation && request.pickupLocation.coordinates && typeof calculateDistance === 'function') {
        const distToPickup = calculateDistance(
            helperLocation.latitude, helperLocation.longitude,
            request.pickupLocation.coordinates[1], request.pickupLocation.coordinates[0]
        );
        pickupDistance = `<span class="distance-info">📍 ${distToPickup.toFixed(1)} km from you</span>`;
    }
    
    if (request.pickupLocation && request.deliveryLocation && typeof calculateDistance === 'function') {
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
    
    // Use escapeHtml if available, otherwise use plain text
    const escapeName = typeof escapeHtml === 'function' ? escapeHtml(foodInfo.name) : foodInfo.name;
    const escapeDescription = typeof escapeHtml === 'function' ? escapeHtml(foodInfo.description) : foodInfo.description;
    const escapeContact = typeof escapeHtml === 'function' ? escapeHtml(foodInfo.contact) : foodInfo.contact;
    const escapePickupAddress = typeof escapeHtml === 'function' ? escapeHtml(request.pickupAddress) : request.pickupAddress;
    const escapeDeliveryAddress = typeof escapeHtml === 'function' ? escapeHtml(request.deliveryAddress) : request.deliveryAddress;
    const escapeRequesterName = typeof escapeHtml === 'function' ? escapeHtml(request.requesterName) : request.requesterName;
    const escapeRequesterContact = typeof escapeHtml === 'function' ? escapeHtml(request.requesterContact) : request.requesterContact;
    const escapePreferredTime = typeof escapeHtml === 'function' ? escapeHtml(request.preferredDeliveryTime) : request.preferredDeliveryTime;
    const escapeNotes = typeof escapeHtml === 'function' ? escapeHtml(request.deliveryNotes) : request.deliveryNotes;
    const escapeHelperName = typeof escapeHtml === 'function' ? escapeHtml(request.helperName) : request.helperName;
    const escapeHelperContact = typeof escapeHtml === 'function' ? escapeHtml(request.helperContact) : request.helperContact;
    
    requestElement.innerHTML = `
        <div class="request-header">
            <h3>${escapeName}</h3>
            <span class="status-badge status-${statusClass}">${request.status.replace('_', ' ')}</span>
        </div>
        
        <div class="request-meta">
            ${pickupDistance} • ${totalDistance} • ${timeAgo}
        </div>
        
        <div class="request-details">
            <div class="food-details">
                <p><strong>Food Description:</strong> ${escapeDescription}</p>
                <p><strong>Food Sharer Contact:</strong> ${escapeContact}</p>
            </div>
            
            <div class="location-details">
                <p><strong>Pickup:</strong> ${escapePickupAddress}</p>
                <p><strong>Delivery:</strong> ${escapeDeliveryAddress}</p>
            </div>
            
            <div class="requester-details">
                <p><strong>Requester:</strong> ${escapeRequesterName}</p>
                <p><strong>Contact:</strong> ${escapeRequesterContact}</p>
                ${request.preferredDeliveryTime ? `<p><strong>Preferred Time:</strong> ${escapePreferredTime}</p>` : ''}
                ${request.deliveryNotes ? `<p><strong>Notes:</strong> ${escapeNotes}</p>` : ''}
            </div>
            
            ${request.helperName ? `
                <div class="helper-details">
                    <p><strong>Helper:</strong> ${escapeHelperName}</p>
                    <p><strong>Helper Contact:</strong> ${escapeHelperContact}</p>
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
        if (typeof showAlert === 'function') {
            showAlert('Request not found', 'error');
        }
        return;
    }
    
    // Set the selected request ID
    const selectedRequestId = document.getElementById('selectedRequestId');
    if (selectedRequestId) {
        selectedRequestId.value = requestId;
    }
    
    // Display request info
    const requestInfo = document.getElementById('deliveryRequestInfo');
    if (requestInfo) {
        const foodInfo = request.foodItemId || { name: 'Unknown Food', description: '', contact: 'N/A' };
        
        const escapeName = typeof escapeHtml === 'function' ? escapeHtml(foodInfo.name) : foodInfo.name;
        const escapeRequesterName = typeof escapeHtml === 'function' ? escapeHtml(request.requesterName) : request.requesterName;
        const escapePickupAddress = typeof escapeHtml === 'function' ? escapeHtml(request.pickupAddress) : request.pickupAddress;
        const escapeDeliveryAddress = typeof escapeHtml === 'function' ? escapeHtml(request.deliveryAddress) : request.deliveryAddress;
        const escapeContact = typeof escapeHtml === 'function' ? escapeHtml(foodInfo.contact) : foodInfo.contact;
        const escapeRequesterContact = typeof escapeHtml === 'function' ? escapeHtml(request.requesterContact) : request.requesterContact;
        
        requestInfo.innerHTML = `
            <div class="request-summary">
                <h4>${escapeName}</h4>
                <p><strong>Requester:</strong> ${escapeRequesterName}</p>
                <p><strong>Pickup:</strong> ${escapePickupAddress}</p>
                <p><strong>Delivery:</strong> ${escapeDeliveryAddress}</p>
                <p><strong>Food Sharer Contact:</strong> ${escapeContact}</p>
                <p><strong>Requester Contact:</strong> ${escapeRequesterContact}</p>
            </div>
        `;
    }
    
    // Show the modal
    const modal = document.getElementById('helperContactModal');
    if (modal) {
        modal.style.display = 'block';
    }
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
            if (typeof showAlert === 'function') {
                showAlert('Please fill in your name and contact information.', 'error');
            }
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
        if (typeof showAlert === 'function') {
            showAlert('Delivery request accepted! 🎉 Please contact both the food sharer and requester to coordinate.', 'success');
        }

    } catch (error) {
        console.error('Error accepting delivery request:', error);
        if (typeof showAlert === 'function') {
            showAlert(error.message || 'Failed to accept delivery request. Please try again.', 'error');
        }
    }
}

// Close helper contact modal
function closeHelperContactModal() {
    const modal = document.getElementById('helperContactModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.querySelector('#helperContactModal form');
        if (form) {
            form.reset();
        }
    }
}