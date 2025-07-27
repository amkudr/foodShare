// API base URL - change this to your server URL
const API_BASE_URL = 'http://localhost:3000/api';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('FoodShare app initialized! 🍽️');
    loadFoodItems();
});

// Load food items from server
async function loadFoodItems() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/food-items`);
        
        if (!response.ok) {
            throw new Error('Failed to load food items');
        }
        
        const foodItems = await response.json();
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
        foodGrid.innerHTML = '<p class="no-items">No food items available yet. Be the first to share!</p>';
        return;
    }
    
    foodItems.forEach(food => {
        const foodElement = createFoodElement(food);
        foodGrid.appendChild(foodElement);
    });
}

// Create HTML element for a food item
function createFoodElement(food) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food-item';
    foodElement.setAttribute('data-id', food._id);
    
    const timeAgo = getTimeAgo(new Date(food.createdAt));
    
    // Use address if available, otherwise show coordinates
    const locationText = food.address || `${food.location.coordinates[1]}, ${food.location.coordinates[0]}`;
    
    foodElement.innerHTML = `
        <h3>${escapeHtml(food.name)}</h3>
        <div class="food-meta">📍 ${escapeHtml(locationText)} • ${timeAgo}</div>
        <div class="food-description">${escapeHtml(food.description)}</div>
        <div class="food-actions">
            <button class="contact-btn" onclick="contactOwner('${escapeHtml(food.contact)}')">Contact</button>
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
window.onclick = function(event) {
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