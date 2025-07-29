// Location Utilities and Management

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