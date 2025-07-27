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
    
    foodElement.innerHTML = `
        <h3>${escapeHtml(food.name)}</h3>
        <div class="food-meta">📍 ${escapeHtml(food.location)} • ${timeAgo}</div>
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
    const form = document.getElementById('addFoodForm');
    form.classList.toggle('active');
    
    // Clear form when closing
    if (!form.classList.contains('active')) {
        document.getElementById('addFoodForm').querySelector('form').reset();
        clearAlert();
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
            description: document.getElementById('description').value.trim()
        };
        
        // Validate form data
        if (!foodData.name || !foodData.location || !foodData.contact) {
            showAlert('Please fill in all required fields.', 'error');
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
            throw new Error('Failed to add food item');
        }
        
        const newFood = await response.json();
        
        // Add to display
        const foodGrid = document.getElementById('foodGrid');
        const foodElement = createFoodElement(newFood);
        foodGrid.insertBefore(foodElement, foodGrid.firstChild);
        
        // Reset form and hide it
        event.target.reset();
        toggleAddForm();
        
        // Show success message
        showAlert('Food item shared successfully! 🎉', 'success');
        
    } catch (error) {
        console.error('Error adding food:', error);
        showAlert('Failed to share food item. Please try again.', 'error');
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
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function toggleAddForm() {
    const modal = document.getElementById("addFoodModal");
    modal.style.display = (modal.style.display === "block") ? "none" : "block";
}

// Close the modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById("addFoodModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};


// Show alert message
function showAlert(message, type = 'success') {
    // Remove existing alerts
    clearAlert();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
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
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}