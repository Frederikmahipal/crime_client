mapboxgl.accessToken = 'pk.eyJ1IjoiZnJlZGVyaWttYWhpcGFsIiwiYSI6ImNsbWNrcWl2NDFkc3IzZXRjZ21nbXA4ZmIifQ.tE_E1ORBr4eJnQ2g4rChfw';

const map = new mapboxgl.Map({
    container: "map",
    center: [-98.5, 39.5], // [lon, lat]
    zoom: 3,
    style: 'mapbox://styles/mapbox/streets-v11',
    maxBounds: [[-125.000000, 24.396308], [-66.934570, 49.384358]]
});
let markers = [];

document.querySelector('#toggle-button').addEventListener('click', function() {
    const light = 'mapbox://styles/mapbox/navigation-day-v1';
    const dark = 'mapbox://styles/mapbox/navigation-night-v1';

    if (this.dataset.value === light) {
        this.dataset.value = dark;
    } else {
        this.dataset.value = light;
    }

    map.setStyle(this.dataset.value);
});

document.getElementById('map-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'block';
    document.getElementById('list').style.display = 'none';
    document.getElementById('suspects').style.display = 'none';
    document.getElementById('toggle-most-wanted-button').style.display = 'none'; // Hide toggle button
    document.getElementById('list-title').style.display = 'none'; // Hide title

});

function fetchCrimes() {
    fetch('/crimes')
        .then(response => response.json())
        .then(data => {
            crimesData = data;
            updateMarkers(data);
        });
}

function updateMarkers(data) {
    markers.forEach(marker => marker.remove());
    markers = [];
   
    data.forEach(crime => {
        // Check if crime has valid lon and lat values
        if (typeof crime.lon === 'number' && typeof crime.lat === 'number') {
            const marker = new mapboxgl.Marker()
                .setLngLat([crime.lon, crime.lat])
                .addTo(map);

            marker.getElement().addEventListener('click', () => showCrimeModal(crime));
            markers.push(marker);
        }
    });
}

let crimesData = [];

map.on('load', fetchCrimes);