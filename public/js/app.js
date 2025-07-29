// API base URL - change this to your server URL
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let allFoodItems = [];
let userLocation = null;

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

// Close the modal when clicking outside of it
window.onclick = function (event) {
    const modal = document.getElementById("addFoodModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

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