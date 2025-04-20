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
        
        map = L.map('map').setView([56.8375, 60.5975], 13);
        
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
            document.getElementById('routeDistance').textContent = 'Маршрут не задан';
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
        document.getElementById('routeDistance').textContent = 'Маршрут не задан';
    }
    
    // Function to calculate the route between waypoints
    function calculateRoute() {
        routeLayer.clearLayers();
    
        if (markers.length < 2) return;
    
        let url = `https://graphhopper.com/api/1/route?vehicle=foot&locale=ru&optimize=true&key=${GRAPHHOPPER_API_KEY}`;
    
        markers.forEach(marker => {
            const latlng = marker.getLatLng();
            url += `&point=${latlng.lat},${latlng.lng}`;
        });
    
        const statusDiv = document.getElementById('routeStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Расчет маршрута...';
            statusDiv.style.display = 'block';
        }
    
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
                    currentRoute = data;
                    // Сохраняем только необходимые данные
                    const routeData = {
                        paths: [{
                            distance: data.paths[0].distance,
                            time: data.paths[0].time,
                            points: data.paths[0].points,
                            snapped_waypoints: data.paths[0].snapped_waypoints
                        }]
                    };
                    document.getElementById('routeData').value = JSON.stringify(routeData);
    
                    const path = data.paths[0];
                    const points = decodePolyline(path.points);
    
                    const polyline = L.polyline(points, {
                        color: '#4a6fa5',
                        weight: 5,
                        opacity: 0.7
                    }).addTo(routeLayer);
    
                    const distanceKm = (path.distance / 1000).toFixed(2);
                    const timeMin = Math.round(path.time / 60000);
    
                    document.getElementById('routeDistance').textContent = `${distanceKm} км`;
    
                    polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);
    
                    map.fitBounds(polyline.getBounds(), {
                        padding: [50, 50]
                    });
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
                document.getElementById('routeDistance').textContent = 'Маршрут не задан';
                alert('Ошибка при расчете маршрута: ' + error.message);
            });
    }
    
    // Function to decode Google Polyline
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
        if (!routeData) {
            document.getElementById('routeDetailsContainer').style.display = 'none';
            return;
        }
    
        try {
            const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
    
            // Инициализируем карту деталей, если она ещё не создана
            if (!detailsMap) {
                detailsMap = L.map('detailsMap').setView([56.8375, 60.5975], 13);
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
    
            // Если есть данные маршрута, отображаем его
            if (data.paths && data.paths.length > 0) {
                const path = data.paths[0];
                const points = decodePolyline(path.points);
    
                // Отрисовываем маршрут
                const polyline = L.polyline(points, {
                    color: '#4a6fa5',
                    weight: 5,
                    opacity: 0.7
                }).addTo(detailsMap);
    
                // Добавляем маркеры для всех точек маршрута
                if (data.paths[0].snapped_waypoints) {
                    const waypointPoints = L.Polyline.fromEncoded(data.paths[0].snapped_waypoints).getLatLngs();
                    waypointPoints.forEach(point => {
                        L.marker([point.lat, point.lng]).addTo(detailsMap);
                    });
                } else if (data.paths[0].points.coordinates) {
                    data.paths[0].points.coordinates.forEach(point => {
                        if (point && point.length >= 2) {
                            L.marker([point[1], point[0]]).addTo(detailsMap);
                        }
                    });
                }
    
                // Вычисляем расстояние и время
                const distanceKm = (path.distance / 1000).toFixed(2);
                const timeMin = Math.round(path.time / 60000);
    
                // Обновляем длину маршрута только если она не была установлена ранее
                const detailsRouteDistance = document.getElementById('detailsRouteDistance');
                if (detailsRouteDistance.textContent === 'Маршрут не задан') {
                    detailsRouteDistance.textContent = `${distanceKm} км`;
                }
    
                // Добавляем всплывающее окно с информацией о маршруте
                polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`).openPopup();
    
                // Подгоняем карту под границы маршрута
                detailsMap.fitBounds(polyline.getBounds(), {
                    padding: [50, 50]
                });
            } else {
                throw new Error('Нет данных о маршруте');
            }
        } catch (error) {
            console.error('Ошибка отображения маршрута на карте деталей:', error);
            document.getElementById('routeDetailsContainer').style.display = 'none';
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
                    setTimeout(initMap, 100);
                }
            }
        });
    });
    
    // Start observing the modal overlay
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
                    // Show route when details modal is shown
                    setTimeout(() => {
                        const routeData = document.getElementById('detailsRouteData').value;
                        if (routeData && routeData.trim() !== '') {
                            showRouteOnDetailsMap(routeData);
                            document.getElementById('routeDetailsContainer').style.display = 'block';
                        } else {
                            document.getElementById('routeDetailsContainer').style.display = 'none';
                            document.getElementById('detailsRouteDistance').textContent = 'Маршрут не задан';
                        }
                    }, 100);
                }
            }
        });
    });
    
    // Start observing the details modal
    const detailsModal = document.getElementById('eventDetailsModal');
    if (detailsModal) {
        detailsModalObserver.observe(detailsModal, { attributes: true });
    }
    
    // Expose functions globally
    window.routePlanner = {
        resetRoute,
        showRouteOnDetailsMap,
        addWaypoint,
        calculateRoute
    };
});