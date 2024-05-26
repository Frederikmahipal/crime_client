document.getElementById('crimes-button').addEventListener('click', function () {
    document.getElementById('map').style.display = 'none';
    document.getElementById('list').style.display = 'block';
    document.getElementById('suspects').style.display = 'none';
    document.getElementById('toggle-most-wanted-button').style.display = 'none'; // Hide toggle button
    document.getElementById('list-title').style.display = 'none'; // Hide title
    document.getElementById('sort-category').style.display = 'block'; // Show category
    fetchCrimesList();
});

function fetchCrimesList() {
    fetch('/crimes')
        .then(response => response.json())
        .then(data => {
            crimesData = data;
            updateCrimes();
        });
}

//Modal
function showCrimeModal(crime) {
    console.log(crime.crimeScene);
    document.getElementById('modal-title').textContent = crime.type;
    document.getElementById('modal-severity').textContent = `Severity: ${crime.severity}`;
    document.getElementById('modal-category').textContent = `Category: ${crime.category}`;
    document.getElementById('modal-description').textContent = `Description: ${crime.description}`;
    document.getElementById('modal-suspects').textContent = `Suspects: ${crime.suspects.map(suspect => suspect.name).join(', ')}`;
    if (crime.crimeScene) {
        document.getElementById('modal-crimeScene').textContent = `Crime Scene: ${crime.crimeScene.location}, Evidence Found: ${crime.crimeScene.foundEvidence}`;
    } else {
        document.getElementById('modal-crimeScene').textContent = 'No crime scene information available';
    }
    document.getElementById('crimeModal').style.display = "block";
}

document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('crimeModal').style.display = "none";
});

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
            <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded see-more">See more</button>
        `;
        list.appendChild(listItem);

        listItem.querySelector('.see-more').addEventListener('click', function() {
            showCrimeModal(crime);
        });
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

function updateCrimes() {
    const sortCategory = document.getElementById('sort-category').value;
    let filteredData = crimesData;
    // Filter by category
    if (sortCategory) {
        filteredData = filteredData.filter(crime => crime.category === sortCategory);
    }
    updateList(filteredData);
    updateMarkers(filteredData);
}

document.getElementById('sort-category').addEventListener('change', updateCrimes);
fetchCrimesList();
window.showCrimeModal = showCrimeModal;