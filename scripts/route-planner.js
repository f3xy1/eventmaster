document.addEventListener('DOMContentLoaded', function() {
    // GraphHopper API key - you should replace this with your own key
    const GRAPHHOPPER_API_KEY = '314f2070-b160-4957-aa40-9b1649f77785';
    
    // Create map variables outside of functions to maintain state
    let map = null;
    let detailsMap = null;
    let markers = [];
    let routeLayer = null;
    let currentRoute = null;
    
    // Function to initialize the map in the event creation modal
    function initMap() {
        if (map !== null) return; // Don't initialize if already exists
        
        // Center the map on a default location (Moscow)
        map = L.map('map').setView([55.7558, 37.6173], 13);
        
        // Add the OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Initialize the route layer for polylines
        routeLayer = L.layerGroup().addTo(map);
        
        // Add click event to map for adding waypoints
        map.on('click', function(e) {
            addWaypoint(e.latlng.lat, e.latlng.lng);
        });
        
        // Reset the map when the modal is closed
        document.querySelector('.close-btn').addEventListener('click', function() {
            if (!currentRoute) {
                resetRoute();
            }
        });
        
        // Add event listener for the reset route button
        document.getElementById('resetRouteBtn').addEventListener('click', resetRoute);
    }
    
    // Function to add a waypoint to the map
    function addWaypoint(lat, lng) {
        // Create a marker at the clicked location
        const marker = L.marker([lat, lng], {
            draggable: true // Make markers draggable
        }).addTo(map);
        
        // Add the marker to our array
        markers.push(marker);
        
        // Add event listener for when marker is dragged
        marker.on('dragend', function() {
            updateRoute();
        });
        
        // Add event listener for when marker is clicked (to remove it)
        marker.on('contextmenu', function() {
            removeWaypoint(marker);
        });
        
        // If we have at least 2 points, calculate the route
        if (markers.length >= 2) {
            calculateRoute();
        }
    }
    
    // Function to remove a waypoint from the map
    function removeWaypoint(marker) {
        // Remove the marker from the map
        map.removeLayer(marker);
        
        // Remove the marker from the array
        markers = markers.filter(m => m !== marker);
        
        // If we still have at least 2 points, recalculate the route
        if (markers.length >= 2) {
            calculateRoute();
        } else {
            // Clear the route if we have less than 2 points
            routeLayer.clearLayers();
            currentRoute = null;
            document.getElementById('routeData').value = '';
        }
    }
    
    // Function to reset the route
    function resetRoute() {
        // Remove all markers from the map
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Clear the route layer
        routeLayer.clearLayers();
        
        // Reset the route data
        currentRoute = null;
        document.getElementById('routeData').value = '';
    }
    
    // Function to calculate the route between waypoints
    // Функция для расчета маршрута между маркерами
    function calculateRoute() {
        // Очистить предыдущий маршрут
        routeLayer.clearLayers();
        
        // Нужно минимум 2 точки для маршрута
        if (markers.length < 2) return;
        
        // Формируем URL API с параметром оптимизации
        let url = `https://graphhopper.com/api/1/route?vehicle=foot&locale=ru&optimize=true&key=${GRAPHHOPPER_API_KEY}`;
        
        // Добавляем точки к URL
        markers.forEach(marker => {
            const latlng = marker.getLatLng();
            url += `&point=${latlng.lat},${latlng.lng}`;
        });
        
        // Показываем индикатор загрузки
        const statusDiv = document.getElementById('routeStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Расчет маршрута...';
            statusDiv.style.display = 'block';
        }
        
        // Выполняем запрос к GraphHopper API
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка API: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }
                
                if (data.paths && data.paths.length > 0) {
                    // Сохраняем данные маршрута
                    currentRoute = data;
                    document.getElementById('routeData').value = JSON.stringify(data);
                    
                    // Получаем точки маршрута
                    const path = data.paths[0];
                    const points = decodePolyline(path.points);
                    
                    // Рисуем маршрут на карте
                    const polyline = L.polyline(points, {
                        color: '#4a6fa5',
                        weight: 5,
                        opacity: 0.7
                    }).addTo(routeLayer);
                    
                    // Добавляем информацию о расстоянии и времени
                    const distanceKm = (path.distance / 1000).toFixed(2);
                    const timeMin = Math.round(path.time / 60000);
                    
                    // Добавляем всплывающее окно с информацией о маршруте
                    polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);
                    
                    // Подгоняем карту под маршрут
                    map.fitBounds(polyline.getBounds(), {
                        padding: [50, 50]
                    });
                    
                    // Обновляем UI с данными маршрута
                    const routeInfoDiv = document.getElementById('routeInfo');
                    if (routeInfoDiv) {
                        routeInfoDiv.innerHTML = `<strong>Расстояние:</strong> ${distanceKm} км, <strong>Время:</strong> ${timeMin} мин`;
                        routeInfoDiv.style.display = 'block';
                    }
                } else {
                    throw new Error('API не вернул маршруты');
                }
            })
            .catch(error => {
                console.error('Ошибка при расчете маршрута:', error);
                if (statusDiv) {
                    statusDiv.textContent = 'Не удалось рассчитать маршрут. Проверьте точки или API-ключ.';
                    statusDiv.style.display = 'block';
                }
                alert('Ошибка при расчете маршрута: ' + error.message);
            });
    }

    // Функция декодирования Google Polyline
        function decodePolyline(encoded) {
            let points = [];
            let index = 0, len = encoded.length;
            let lat = 0, lng = 0;

            while (index < len) {
                let b, shift = 0, result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lat += dlat;

                shift = 0;
                result = 0;
                do {
                    b = encoded.charCodeAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
                lng += dlng;

                points.push([lat / 1e5, lng / 1e5]);
            }
            return points;
        }
    
    // Function to update the route when markers are moved
    function updateRoute() {
        if (markers.length >= 2) {
            calculateRoute();
        }
    }
    
    // Function to show route on the details map
    function showRouteOnDetailsMap(routeData) {
        if (!routeData) return;
        
        try {
            const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
            
            // Initialize details map if not already done
            if (!detailsMap) {
                detailsMap = L.map('detailsMap').setView([55.7558, 37.6173], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(detailsMap);
            } else {
                detailsMap.eachLayer(layer => {
                    if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                        detailsMap.removeLayer(layer);
                    }
                });
            }
            
            // If we have path data, display it
            if (data.paths && data.paths.length > 0) {
                const path = data.paths[0];
                const points = decodePolyline(path.points);
                
                // Draw the route
                const polyline = L.polyline(points, {
                    color: '#4a6fa5',
                    weight: 5,
                    opacity: 0.7
                }).addTo(detailsMap);
                
                // Extract and add markers for all waypoints from the path
                if (data.paths[0].snapped_waypoints) {
                    const waypointPoints = L.Polyline.fromEncoded(data.paths[0].snapped_waypoints).getLatLngs();
                    waypointPoints.forEach(point => {
                        L.marker([point.lat, point.lng]).addTo(detailsMap);
                    });
                } else {
                    // Fallback to the points from the request if snapped_waypoints not available
                    data.paths[0].points.forEach(point => {
                        if (point && point.lat && point.lng) {
                            L.marker([point.lat, point.lng]).addTo(detailsMap);
                        }
                    });
                }
                
                // Add distance and time information
                const distanceKm = (path.distance / 1000).toFixed(2);
                const timeMin = Math.round(path.time / 60000);
                
                // Add a popup to the polyline with route information
                polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`).openPopup();
                
                // Update route information element if it exists
                const routeInfoElement = document.getElementById('detailsRouteInfo');
                if (routeInfoElement) {
                    routeInfoElement.innerHTML = `<strong>Расстояние:</strong> ${distanceKm} км<br><strong>Время:</strong> ${timeMin} мин`;
                    routeInfoElement.style.display = 'block';
                }
                
                // Fit the map to show the entire route
                detailsMap.fitBounds(polyline.getBounds(), {
                    padding: [50, 50]
                });
            } else {
                throw new Error('No path data available');
            }
        } catch (error) {
            console.error('Error showing route on details map:', error);
            const errorElement = document.getElementById('detailsRouteError');
            if (errorElement) {
                errorElement.textContent = 'Не удалось отобразить маршрут. Данные повреждены или отсутствуют.';
                errorElement.style.display = 'block';
            }
        }
    }
    
    // Listen for the modal to be opened
    const modalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const modalOverlay = document.getElementById('modalOverlay');
                const display = window.getComputedStyle(modalOverlay).getPropertyValue('display');
                
                if (display === 'flex') {
                    // Initialize map when modal is shown
                    setTimeout(initMap, 100); // Small delay to ensure DOM is ready
                }
            }
        });
    });
    
    // Start observing the modal overlay for style changes
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalObserver.observe(modalOverlay, { attributes: true });
    }
    
    // Listen for details modal to be opened
    const detailsModalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const detailsModal = document.getElementById('eventDetailsModal');
                const display = window.getComputedStyle(detailsModal).getPropertyValue('display');
                
                if (display === 'flex') {
                    // Initialize details map when modal is shown
                    setTimeout(() => {
                        const routeData = document.getElementById('detailsRouteData').value;
                        if (routeData && routeData.trim() !== '') {
                            showRouteOnDetailsMap(routeData);
                            document.getElementById('routeDetailsContainer').style.display = 'block';
                        } else {
                            // Hide the map container if no route data
                            document.getElementById('routeDetailsContainer').style.display = 'none';
                        }
                    }, 100);
                }
            }
        });
    });
    
    // Start observing the details modal overlay for style changes
    const detailsModal = document.getElementById('eventDetailsModal');
    if (detailsModal) {
        detailsModalObserver.observe(detailsModal, { attributes: true });
    }
    
    // Make functions available globally for use in other scripts
    window.routePlanner = {
        resetRoute,
        showRouteOnDetailsMap,
        addWaypoint, // Expose to allow programmatic waypoint addition
        calculateRoute // Expose to allow manual route calculation
    };
});