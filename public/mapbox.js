mapboxgl.accessToken = 'pk.eyJ1IjoiZnJlZGVyaWttYWhpcGFsIiwiYSI6ImNsbWNrcWl2NDFkc3IzZXRjZ21nbXA4ZmIifQ.tE_E1ORBr4eJnQ2g4rChfw';

const map = new mapboxgl.Map({
    container: "map",
    center: [10.3, 55.3], // [lon, lat]
    zoom: 6,
    style: 'mapbox://styles/mapbox/streets-v11',
    maxBounds: [[3.0, 52.0], [20.0, 58.0]]
});

let markers = [];

document.querySelector('#toggle-button').addEventListener('click', function() {
    const dayStyle = 'mapbox://styles/mapbox/navigation-day-v1';
    const nightStyle = 'mapbox://styles/mapbox/navigation-night-v1';

    if (this.dataset.value === dayStyle) {
        this.dataset.value = nightStyle;
    } else {
        this.dataset.value = dayStyle;
    }

    map.setStyle(this.dataset.value);
});

document.getElementById('map-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'block';
    document.getElementById('list').style.display = 'none';
});

document.getElementById('list-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'none';
    document.getElementById('list').style.display = 'block';
    fetchCrimesList();
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
    // Remove all existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Add new markers
    data.forEach(crime => {
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3>${crime.type}</h3><p>${crime.description}</p>`);

        const marker = new mapboxgl.Marker()
            .setLngLat([crime.lon, crime.lat])
            .setPopup(popup) // bind the popup to the marker
            .addTo(map);

        markers.push(marker);
    });
}

let crimesData = [];

function fetchCrimesList() {
    fetch('/crimes')
        .then(response => response.json())
        .then(data => {
            crimesData = data;
            updateList(data);
        });
}

function updateList(data) {
    const list = document.getElementById('list');
    list.innerHTML = '';
    data.forEach(crime => {
        const listItem = document.createElement('div');
        listItem.className = 'p-6 px-8 mb-4 bg-white rounded shadow-lg'; 
        listItem.innerHTML = `
            <h2 class="font-bold text-xl mb-2">${crime.type}</h2>
            <p class="text-gray-700"><span class="font-semibold">Severity:</span> ${crime.severity}</p>
            <p class="text-gray-700"><span class="font-semibold">Suspects:</span> ${crime.suspects.map(suspect => suspect.name).join(', ')}</p>
            <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">See more</button>
        `;
        list.appendChild(listItem);
    });
}


document.getElementById('search-bar').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredData = crimesData.filter(crime =>
        crime.type.toLowerCase().includes(searchTerm) ||
        String(crime.severity).toLowerCase().includes(searchTerm) ||
        crime.suspects.some(suspect => suspect.name.toLowerCase().includes(searchTerm))
    );
    updateList(filteredData);
    updateMarkers(filteredData);
});

fetchCrimesList();
document.getElementById('map').style.display = 'block';
document.getElementById('list').style.display = 'none'; 
map.on('load', fetchCrimes);