mapboxgl.accessToken = 'pk.eyJ1IjoiZnJlZGVyaWttYWhpcGFsIiwiYSI6ImNsbWNrcWl2NDFkc3IzZXRjZ21nbXA4ZmIifQ.tE_E1ORBr4eJnQ2g4rChfw';

const map = new mapboxgl.Map({
    container: "map",
    center: [10.3, 55.3], // [lon, lat]
    zoom: 6,
    style: 'mapbox://styles/mapbox/streets-v11',
    maxBounds: [[3.0, 52.0], [20.0, 58.0]]
});

document.getElementById('styleSelector').addEventListener('change', function () {
    map.setStyle(this.value);
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
            console.log(data);
            data.forEach(crime => {
                const marker = new mapboxgl.Marker()
                    .setLngLat([crime.lon, crime.lat])
                    .addTo(map);

                const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
                    .setHTML(`
                        <p>Crime Type: ${crime.type}, Severity: ${crime.severity}, suspects: ${crime.suspects.map(suspect => suspect.name).join(', ')}</p>
                        <button id="more-info-${crime.id}">See more</button>
                    `);

                marker.setPopup(popup);

                popup.on('open', () => {
                    const moreInfoButton = document.getElementById(`more-info-${crime.id}`);
                    if (moreInfoButton) {
                        moreInfoButton.addEventListener('click', (e) => {
                            e.stopPropagation();  // Prevent the map from handling the click event
                            popup.remove();  // Close the original popup
                            const detailedPopup = new mapboxgl.Popup({ offset: 25 })
                                .setLngLat([crime.lon, crime.lat])
                                .setHTML(`
                                    <p>Description: ${crime.description}</p>
                                    <p>Suspects: ${crime.suspects.map(suspect => `Name: ${suspect.name}, CPR: ${suspect.cpr}`).join(', ')}</p>
                                `)
                                .addTo(map);
                        });
                    }
                });
            });
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
        listItem.className = 'p-2 border border-gray-300 rounded';
        listItem.innerHTML = `
            <h2 class="font-bold text-lg">${crime.type}</h2>
            <p>Severity: ${crime.severity}</p>
            <p>Suspects: ${crime.suspects.map(suspect => suspect.name).join(', ')}</p>
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
});
fetchCrimesList();
document.getElementById('map').style.display = 'block';
document.getElementById('list').style.display = 'none'; 
map.on('load', fetchCrimes);