document.addEventListener('DOMContentLoaded', function() {
    // GraphHopper API key - replace with your own key
    const GRAPHHOPPER_API_KEY = '314f2070-b160-4957-aa40-9b1649f77785';

    // State management for multiple maps
    const mapStates = {
        creation: { map: null, markers: [], routeLayer: null, currentRoute: null },
        edit: { map: null, markers: [], routeLayer: null, currentRoute: null },
        details: { map: null, markers: [], routeLayer: null, currentRoute: null }
    };

    // Function to initialize a map for a given context
    function initMap(mapId, context = 'creation', routeData = null) {
        const state = mapStates[context];
        if (state.map !== null) return; // Don't initialize if already exists

        state.map = L.map(mapId).setView([56.8375, 60.5975], 13);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.map);

        // Initialize route layer
        state.routeLayer = L.layerGroup().addTo(state.map);

        // For creation and edit contexts, add interactive events
        if (context === 'creation' || context === 'edit') {
            // Add click event for adding waypoints
            state.map.on('click', function(e) {
                addWaypoint(e.latlng.lat, e.latlng.lng, context);
            });

            // Reset route when modal is closed (only for creation)
            if (context === 'creation') {
                document.querySelector('.close-btn').addEventListener('click', function() {
                    if (!state.currentRoute) {
                        resetRoute(context);
                    }
                });
            }

            // Add event listener for reset route button
            const resetBtnId = context === 'creation' ? 'resetRouteBtn' : 'resetEditRouteBtn';
            const resetBtn = document.getElementById(resetBtnId);
            if (resetBtn) {
                resetBtn.addEventListener('click', () => resetRoute(context));
            }
        }

        // Load existing route data for edit or details context
        if (routeData && (context === 'edit' || context === 'details')) {
            try {
                const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
                if (context === 'edit' && data.paths && data.paths[0].snapped_waypoints) {
                    const waypoints = L.Polyline.fromEncoded(data.paths[0].snapped_waypoints).getLatLngs();
                    waypoints.forEach(point => addWaypoint(point.lat, point.lng, context));
                }
                if (context === 'details') {
                    showRouteOnMap(data, context);
                }
            } catch (error) {
                console.error(`Ошибка загрузки маршрута для ${context}:`, error);
            }
        }
    }

    // Function to add a waypoint
    function addWaypoint(lat, lng, context = 'creation') {
        const state = mapStates[context];

        // Create a marker
        const marker = L.marker([lat, lng], {
            draggable: context !== 'details' // Draggable only in creation/edit
        }).addTo(state.map);

        state.markers.push(marker);

        // Add dragend event for creation/edit
        if (context !== 'details') {
            marker.on('dragend', function() {
                updateRoute(context);
            });

            // Add contextmenu event to remove marker
            marker.on('contextmenu', function() {
                removeWaypoint(marker, context);
            });
        }

        // Calculate route if there are at least 2 points
        if (state.markers.length >= 2 && context !== 'details') {
            calculateRoute(context);
        }
    }

    // Function to remove a waypoint
    function removeWaypoint(marker, context = 'creation') {
        const state = mapStates[context];

        // Remove marker from map and array
        state.map.removeLayer(marker);
        state.markers = state.markers.filter(m => m !== marker);

        // Recalculate route or clear if insufficient points
        if (state.markers.length >= 2) {
            calculateRoute(context);
        } else {
            state.routeLayer.clearLayers();
            state.currentRoute = null;
            const dataInputId = context === 'creation' ? 'routeData' : 'editRouteData';
            const distanceId = context === 'creation' ? 'routeDistance' : 'editRouteDistance';
            document.getElementById(dataInputId).value = '';
            document.getElementById(distanceId).textContent = 'Маршрут не задан';
        }
    }

    // Function to reset the route
    function resetRoute(context = 'creation') {
        const state = mapStates[context];

        // Remove all markers
        state.markers.forEach(marker => state.map.removeLayer(marker));
        state.markers = [];

        // Clear route layer
        state.routeLayer.clearLayers();

        // Reset route data
        state.currentRoute = null;
        const dataInputId = context === 'creation' ? 'routeData' : 'editRouteData';
        const distanceId = context === 'creation' ? 'routeDistance' : 'editRouteDistance';
        document.getElementById(dataInputId).value = '';
        document.getElementById(distanceId).textContent = 'Маршрут не задан';
    }

    // Function to calculate the route
    function calculateRoute(context = 'creation') {
        const state = mapStates[context];
        state.routeLayer.clearLayers();

        if (state.markers.length < 2) return;

        let url = `https://graphhopper.com/api/1/route?vehicle=foot&locale=ru&optimize=true&key=${GRAPHHOPPER_API_KEY}`;

        state.markers.forEach(marker => {
            const latlng = marker.getLatLng();
            url += `&point=${latlng.lat},${latlng.lng}`;
        });

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка API: ${response.status} - ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.paths && data.paths.length > 0) {
                    state.currentRoute = data;
                    const routeData = {
                        paths: [{
                            distance: data.paths[0].distance,
                            time: data.paths[0].time,
                            points: data.paths[0].points,
                            snapped_waypoints: data.paths[0].snapped_waypoints
                        }]
                    };
                    const dataInputId = context === 'creation' ? 'routeData' : 'editRouteData';
                    document.getElementById(dataInputId).value = JSON.stringify(routeData);

                    const path = data.paths[0];
                    const points = decodePolyline(path.points);

                    const polyline = L.polyline(points, {
                        color: '#4a6fa5',
                        weight: 5,
                        opacity: 0.7
                    }).addTo(state.routeLayer);

                    const distanceKm = (path.distance / 1000).toFixed(2);
                    const timeMin = Math.round(path.time / 60000);

                    const distanceId = context === 'creation' ? 'routeDistance' : 'editRouteDistance';
                    document.getElementById(distanceId).textContent = `${distanceKm} км`;

                    polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

                    state.map.fitBounds(polyline.getBounds(), {
                        padding: [50, 50]
                    });
                } else {
                    throw new Error('API не вернул маршруты');
                }
            })
            .catch(error => {
                console.error(`Ошибка при расчете маршрута (${context}):`, error);
                const distanceId = context === 'creation' ? 'routeDistance' : 'editRouteDistance';
                document.getElementById(distanceId).textContent = 'Маршрут не задан';
                alert('Ошибка при расчете маршрута: ' + error.message);
            });
    }

    // Function to decode GraphHopper polyline
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

    // Function to show route on a map (used for details and edit)
    function showRouteOnMap(routeData, context = 'details') {
        const state = mapStates[context];

        if (!routeData) {
            const containerId = context === 'details' ? 'routeDetailsContainer' : 'editMapContainer';
            document.getElementById(containerId).style.display = 'none';
            return;
        }

        try {
            const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;

            if (!state.map) {
                state.map = L.map(context === 'details' ? 'detailsMap' : 'editMap').setView([56.8375, 60.5975], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(state.map);
                state.routeLayer = L.layerGroup().addTo(state.map);
            } else {
                state.routeLayer.clearLayers();
                state.markers.forEach(marker => state.map.removeLayer(marker));
                state.markers = [];
            }

            if (data.paths && data.paths.length > 0) {
                const path = data.paths[0];
                const points = decodePolyline(path.points);

                const polyline = L.polyline(points, {
                    color: '#4a6fa5',
                    weight: 5,
                    opacity: 0.7
                }).addTo(state.routeLayer);

                if (context === 'details' && path.snapped_waypoints) {
                    const waypointPoints = L.Polyline.fromEncoded(path.snapped_waypoints).getLatLngs();
                    waypointPoints.forEach(point => {
                        const marker = L.marker([point.lat, point.lng]).addTo(state.map);
                        state.markers.push(marker);
                    });
                }

                const distanceKm = (path.distance / 1000).toFixed(2);
                const timeMin = Math.round(path.time / 60000);

                const distanceId = context === 'details' ? 'detailsRouteDistance' : 'editRouteDistance';
                document.getElementById(distanceId).textContent = `${distanceKm} км`;

                polyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

                state.map.fitBounds(polyline.getBounds(), {
                    padding: [50, 50]
                });
            } else {
                throw new Error('Нет данных о маршруте');
            }
        } catch (error) {
            console.error(`Ошибка отображения маршрута (${context}):`, error);
            const containerId = context === 'details' ? 'routeDetailsContainer' : 'editMapContainer';
            document.getElementById(containerId).style.display = 'none';
        }
    }

    // Observe modal for creation
    const modalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const modalOverlay = document.getElementById('modalOverlay');
                const display = window.getComputedStyle(modalOverlay).getPropertyValue('display');
                if (display === 'flex') {
                    setTimeout(() => initMap('map', 'creation'), 100);
                }
            }
        });
    });

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalObserver.observe(modalOverlay, { attributes: true });
    }

    // Observe details modal
    const detailsModalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const detailsModal = document.getElementById('eventDetailsModal');
                const display = window.getComputedStyle(detailsModal).getPropertyValue('display');
                if (display === 'flex') {
                    setTimeout(() => {
                        const routeData = document.getElementById('detailsRouteData').value;
                        if (routeData && routeData.trim() !== '') {
                            showRouteOnMap(routeData, 'details');
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

    const detailsModal = document.getElementById('eventDetailsModal');
    if (detailsModal) {
        detailsModalObserver.observe(detailsModal, { attributes: true });
    }

    // Expose functions globally
    window.routePlanner = {
        initMap,
        resetRoute,
        showRouteOnMap,
        addWaypoint,
        calculateRoute
    };
});