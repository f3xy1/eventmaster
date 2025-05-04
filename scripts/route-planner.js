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
        if (state.map !== null) {
            console.log(`Map for ${context} already initialized, skipping reinitialization.`);
            return; // Don't reinitialize if already exists
        }

        console.log(`Initializing map for ${context} with mapId: ${mapId}`);
        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            console.error(`Map container #${mapId} not found in DOM`);
            return;
        }

        state.map = L.map(mapId).setView([56.8375, 60.5975], 13);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.map);

        // Initialize route layer
        state.routeLayer = L.layerGroup().addTo(state.map);

        // For creation and edit contexts, add interactive events
        if (context === 'creation' || context === 'edit') {
            // Add click event for adding waypoints
            state.map.on('click', function(e) {
                console.log(`Map clicked in ${context} mode at: ${e.latlng.lat}, ${e.latlng.lng}`);
                addWaypoint(e.latlng.lat, e.latlng.lng, context);
            });

            // Reset route when modal is closed (only for creation)
            if (context === 'creation') {
                const closeBtn = document.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                        if (!state.currentRoute) {
                            resetRoute(context);
                        }
                    });
                }
            }

            // Add event listener for reset route button
            const resetBtnId = context === 'creation' ? 'resetRouteBtn' : 'resetEditRouteBtn';
            const resetBtn = document.getElementById(resetBtnId);
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    console.log(`Reset route button clicked in ${context} mode`);
                    resetRoute(context);
                });
            }
        }

        // Load existing route data for edit context
        if (routeData && context === 'edit') {
            try {
                const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
                if (data.paths && data.paths[0].snapped_waypoints) {
                    const waypoints = polyline.decode(data.paths[0].snapped_waypoints).map(coord => [coord[0], coord[1]]);
                    console.log(`Loading ${waypoints.length} waypoints for ${context} mode:`, waypoints);
                    waypoints.forEach(point => addWaypoint(point[0], point[1], context));
                }
            } catch (error) {
                console.error(`Ошибка загрузки маршрута для ${context}:`, error);
            }
        }
    }

    // Function to reset the edit map to a specific route
    function resetEditMap(routeData = null) {
        const state = mapStates.edit;
        console.log(`Resetting edit map with routeData:`, routeData);
        
        // Clear existing map state
        if (state.map) {
            state.markers.forEach(marker => state.map.removeLayer(marker));
            state.markers = [];
            state.routeLayer.clearLayers();
            state.currentRoute = null;
            state.map.remove();
            state.map = null;
        }
        
        // Reinitialize the edit map
        initMap('editMap', 'edit', routeData);
    }

    // Function to add a waypoint
    function addWaypoint(lat, lng, context = 'creation') {
        const state = mapStates[context];

        // Create a marker
        const marker = L.marker([lat, lng], {
            draggable: context === 'creation' || context === 'edit' // Draggable in creation and edit modes
        }).addTo(state.map);

        console.log(`Added waypoint at (${lat}, ${lng}) in ${context} mode, draggable: ${marker.options.draggable}`);
        state.markers.push(marker);

        // Add dragend event for creation/edit
        if (context === 'creation' || context === 'edit') {
            marker.on('dragend', function() {
                console.log(`Waypoint dragged to (${marker.getLatLng().lat}, ${marker.getLatLng().lng}) in ${context} mode`);
                updateRoute(context);
            });

            // Add contextmenu event to remove marker
            marker.on('contextmenu', function() {
                console.log(`Removing waypoint at (${lat}, ${lng}) in ${context} mode`);
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
                    const points = polyline.decode(path.points).map(coord => [coord[0], coord[1]]);

                    const routePolyline = L.polyline(points, {
                        color: '#4a6fa5',
                        weight: 5,
                        opacity: 0.7
                    }).addTo(state.routeLayer);

                    const distanceKm = (path.distance / 1000).toFixed(2);
                    const timeMin = Math.round(path.time / 60000);

                    const distanceId = context === 'creation' ? 'routeDistance' : 'editRouteDistance';
                    document.getElementById(distanceId).textContent = `${distanceKm} км`;

                    routePolyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

                    state.map.fitBounds(routePolyline.getBounds(), {
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

    // Function to show route on a map (used for details)
    function showRouteOnMap(routeData, context = 'details') {
        const state = mapStates[context];
        const mapId = context === 'details' ? 'detailsMap' : 'editMap';
        const containerId = context === 'details' ? 'routeDetailsContainer' : 'editMapContainer';

        if (!routeData) {
            console.log(`No route data provided for ${context}, hiding map container`);
            document.getElementById(containerId).style.display = 'none';
            return;
        }

        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            console.error(`Map container #${mapId} not found in DOM for ${context}`);
            document.getElementById(containerId).style.display = 'none';
            return;
        }

        try {
            const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
            if (!data.paths || !data.paths[0] || !data.paths[0].points) {
                console.warn(`Invalid route data for ${context}:`, data);
                document.getElementById(containerId).style.display = 'none';
                return;
            }

            // Ensure container is visible
            document.getElementById(containerId).style.display = 'block';

            // Always reinitialize the details map to ensure it renders for new events
            if (context === 'details' && state.map) {
                console.log(`Clearing existing details map state`);
                state.markers.forEach(marker => state.map.removeLayer(marker));
                state.markers = [];
                state.routeLayer.clearLayers();
                state.map.remove();
                state.map = null;
            }

            if (!state.map) {
                console.log(`Initializing new map for ${context} with mapId: ${mapId}`);
                state.map = L.map(mapId).setView([56.8375, 60.5975], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(state.map);
                state.routeLayer = L.layerGroup().addTo(state.map);
            } else {
                console.log(`Clearing route layer and markers for ${context}`);
                state.routeLayer.clearLayers();
                state.markers.forEach(marker => state.map.removeLayer(marker));
                state.markers = [];
            }

            const path = data.paths[0];
            const points = polyline.decode(path.points).map(coord => [coord[0], coord[1]]);
            console.log(`Decoded ${points.length} points for ${context} route`);

            if (points.length < 2) {
                throw new Error('Недостаточно точек для построения маршрута');
            }

            const routePolyline = L.polyline(points, {
                color: '#4a6fa5',
                weight: 5,
                opacity: 0.7
            }).addTo(state.routeLayer);

            if (context === 'details' && path.snapped_waypoints) {
                const waypointPoints = polyline.decode(path.snapped_waypoints).map(coord => [coord[0], coord[1]]);
                console.log(`Loading ${waypointPoints.length} waypoints for ${context}:`, waypointPoints);
                waypointPoints.forEach(point => {
                    const marker = L.marker(point).addTo(state.map);
                    state.markers.push(marker);
                });
            }

            const distanceKm = (path.distance / 1000).toFixed(2);
            const timeMin = Math.round(path.time / 60000);

            const distanceId = context === 'details' ? 'detailsRouteDistance' : 'editRouteDistance';
            document.getElementById(distanceId).textContent = `${distanceKm} км`;

            routePolyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

            // Center and zoom to route bounds
            const bounds = routePolyline.getBounds();
            if (bounds.isValid()) {
                console.log(`Centering map for ${context} with bounds:`, bounds);
                state.map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                console.warn(`Invalid bounds for ${context} polyline, centering on first point`);
                if (points.length > 0) {
                    state.map.setView([points[0][0], points[0][1]], 13);
                } else {
                    console.warn(`No valid points, using default view for ${context}`);
                    state.map.setView([56.8375, 60.5975], 13);
                }
            }
        } catch (error) {
            console.error(`Ошибка отображения маршрута (${context}):`, error);
            document.getElementById(containerId).style.display = 'none';
        }
    }

    // Function to update route after dragging
    function updateRoute(context) {
        console.log(`Updating route in ${context} mode due to waypoint drag`);
        calculateRoute(context);
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
                        const routeData = document.getElementById('detailsRouteData')?.value;
                        console.log(`Details modal opened, routeData:`, routeData);
                        if (routeData && routeData.trim() !== '') {
                            showRouteOnMap(routeData, 'details');
                            document.getElementById('routeDetailsContainer').style.display = 'block';
                        } else {
                            console.log(`No route data for details modal, hiding container`);
                            document.getElementById('routeDetailsContainer').style.display = 'none';
                            document.getElementById('detailsRouteDistance').textContent = 'Маршрут не задан';
                        }
                    }, 500);
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
        calculateRoute,
        resetEditMap
    };
});